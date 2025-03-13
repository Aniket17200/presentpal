require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const multer = require('multer');
const fs = require('fs');
const fsPromises = fs.promises;  // Full fs module for streams, and fs.promises for async ops
const path = require('path');
const cors = require('cors');
const shell = require('shelljs');
const poppler = require('pdf-poppler');
const AdmZip = require('adm-zip');
const FormData = require('form-data');
const axios = require('axios');
const bodyParser = require('body-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: process.env.TRUSTED_DOMAIN || '*' }));
app.use(bodyParser.json());
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Supabase Client
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Multer configuration with original filename preservation
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const tempDir = path.join('uploads', `temp-${Date.now()}`);
        fsPromises.mkdir(tempDir, { recursive: true })
            .then(() => cb(null, tempDir))
            .catch((err) => cb(err));
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname); // Preserve original filename with extension
    },
});
const upload = multer({ storage });

// Add LibreOffice to PATH if needed (Windows-specific)
process.env.PATH += `;C:\\Program Files\\LibreOffice\\program`;

// ### Helper Functions

// Convert PPT to PDF
const convertToPDF = (file, ext, outdir) => {
    return new Promise((resolve, reject) => {
        const office = process.env.PPT_TO_PDF_PATH || "soffice";
        const validExtensions = [".ppt", ".pptx", ".pps", ".ppsx"].map(e => e.toLowerCase());
        if (validExtensions.includes(ext.toLowerCase())) {
            const command = `"${office}" --headless --convert-to pdf --outdir "${outdir}" "${file}"`;
            console.log("Running command:", command);
            shell.exec(command, { silent: true }, (code, stdout, stderr) => {
                if (code !== 0) {
                    console.error(`Conversion failed with stderr: ${stderr}`);
                    reject(new Error(`Conversion failed: ${stderr}`));
                } else {
                    const pdfPath = path.join(outdir, path.basename(file, ext) + ".pdf");
                    console.log("PDF saved locally at:", pdfPath);
                    resolve(pdfPath);
                }
            });
        } else {
            reject(new Error("Invalid file type for conversion."));
        }
    });
};

// Convert PDF to images using pdf-poppler
const convertPDFToImages = async (pdfPath, outputDir) => {
    try {
        // Verify PDF file exists
        await fsPromises.access(pdfPath, fs.constants.F_OK);
        console.log(`PDF file exists: ${pdfPath}`);

        const outputPrefix = path.join(outputDir, "page");
        const opts = {
            format: "png",
            out_dir: outputDir,
            out_prefix: path.basename(outputPrefix),
            page: null, // Convert all pages
        };
        await poppler.convert(pdfPath, opts);
        console.log("PDF converted to images");
        const files = await fsPromises.readdir(outputDir);
        const images = files
            .filter((file) => file.startsWith("page") && file.endsWith(".png"))
            .map((file) => path.join(outputDir, file));
        return images;
    } catch (error) {
        console.error("Error converting PDF to images:", error);
        throw error;
    }
};

// Check if a file exists in Supabase
async function fileExistsInSupabase(bucketName, filePath) {
    const { data, error } = await supabase.storage
        .from(bucketName)
        .list(filePath.split('/')[0], { search: filePath.split('/').pop() });
    if (error) {
        console.error('Error checking file existence:', error);
        return false;
    }
    return data.some(file => file.name === filePath.split('/').pop());
}

// Upload file to Supabase with duplicate handling
async function uploadFileToSupabase(bucketName, filePath, fileContent) {
    try {
        const fileExists = await fileExistsInSupabase(bucketName, filePath);
        if (fileExists) {
            console.log(`File ${filePath} already exists in bucket ${bucketName}. Skipping upload.`);
            const { publicURL: publicUrl } = supabase.storage
                .from(bucketName)
                .getPublicUrl(filePath);
            return { path: filePath, publicUrl };
        }
        const { data, error } = await supabase.storage
            .from(bucketName)
            .upload(filePath, fileContent);
        if (error) {
            if (error.statusCode === '409') {
                console.log(`File ${filePath} already exists (confirmed by API). Using existing file.`);
                const { publicURL: publicUrl } = supabase.storage
                    .from(bucketName)
                    .getPublicUrl(filePath);
                return { path: filePath, publicUrl };
            }
            console.error('Error uploading file to Supabase:', error);
            throw error;
        }
        const { publicURL: publicUrl } = supabase.storage
            .from(bucketName)
            .getPublicUrl(data.path);
        return { path: data.path, publicUrl };
    } catch (err) {
        console.error('Error in uploadFileToSupabase:', err);
        throw err;
    }
}

// Retry file deletion
const retryDelete = async (filePath, retries = 3, delay = 1000) => {
    for (let i = 0; i < retries; i++) {
        try {
            await fsPromises.rm(filePath, { force: true, recursive: true });
            console.log("File deleted successfully:", filePath);
            return;
        } catch (err) {
            console.warn(`Attempt ${i + 1}: Error deleting file`, filePath, err);
            if (i < retries - 1) await new Promise((resolve) => setTimeout(resolve, delay));
        }
    }
    console.error("Failed to delete file after retries:", filePath);
};

// ### Pipeline Functions

// Process PPT to images
async function processPPTToImages(pptPath) {
    let pdfPath, tempDir;
    try {
        tempDir = path.join('temp-images', `temp-${Date.now()}`);
        await fsPromises.mkdir(tempDir, { recursive: true });

        const ext = path.extname(pptPath);
        const originalName = path.basename(pptPath, ext);

        // Convert PPT to PDF
        pdfPath = await convertToPDF(pptPath, ext, tempDir);

        // Wait 1 second to ensure the PDF is fully written
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Convert PDF to images
        const images = await convertPDFToImages(pdfPath, tempDir);

        // Create a unique folder for images in Supabase
        const folderName = `pdf-${Date.now()}-${originalName}`;
        const imageUrls = [];

        // Upload images to Supabase
        for (let i = 0; i < images.length; i++) {
            const imagePath = images[i];
            const imageFileName = `${folderName}/image-${i + 1}.png`;
            const fileContent = await fsPromises.readFile(imagePath);
            const { publicUrl } = await uploadFileToSupabase("ppt-images", imageFileName, fileContent);
            imageUrls.push(publicUrl);
        }

        return { folderName, imageUrls };
    } finally {
        if (pdfPath) await retryDelete(pdfPath);
        if (tempDir) await retryDelete(tempDir);
    }
}

// Process PPT and image to videos
async function processPPTToVideo(pptPath, imagePath) {
    let zipFilePath, animatedVideoPath, extractDir;
    const finalVideoPaths = [];
    const videoUrls = [];

    try {
        extractDir = path.join('temp-video', `temp-${Date.now()}-audio`);
        await fsPromises.mkdir(extractDir, { recursive: true });

        // Step 1: Generate audio from PPT
        const audioFormData = new FormData();
        audioFormData.append('file', fs.createReadStream(pptPath), { 
            filename: path.basename(pptPath),
            contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        });

        const audioResponse = await axios.post(
            'https://2c8e-35-240-223-38.ngrok-free.app/generate-audio/',
            audioFormData,
            {
                headers: audioFormData.getHeaders(),
                responseType: 'arraybuffer',
            }
        );

        zipFilePath = path.join(extractDir, 'audio.zip');
        await fsPromises.writeFile(zipFilePath, Buffer.from(audioResponse.data));
        const zip = new AdmZip(zipFilePath);
        zip.extractAllTo(extractDir, true);

        const audioFiles = (await fsPromises.readdir(extractDir)).filter(file => file.endsWith('.wav'));

        // Step 2: Generate animated video from image
        const animateFormData = new FormData();
        animateFormData.append('image', fs.createReadStream(imagePath), { 
            filename: path.basename(imagePath),
            contentType: 'image/png',
        });

        const animateResponse = await axios.post(
            'https://6392-34-169-212-19.ngrok-free.app/animate',
            animateFormData,
            {
                headers: animateFormData.getHeaders(),
                responseType: 'arraybuffer',
            }
        );

        animatedVideoPath = path.join(extractDir, 'animated_video.mp4');
        await fsPromises.writeFile(animatedVideoPath, Buffer.from(animateResponse.data));

        // Step 3: Combine animated video with each audio file
        const uniqueFolderName = `videos/${Date.now()}_${path.basename(pptPath, path.extname(pptPath))}`;
        for (const audioFile of audioFiles) {
            const slideNumber = audioFile.match(/slide_(\d+)\.wav/)?.[1] || audioFile.split('.')[0];
            const finalVideoPath = path.join(extractDir, `final_video_slide_${slideNumber}.mp4`);
            finalVideoPaths.push(finalVideoPath);

            const processFormData = new FormData();
            processFormData.append('video', fs.createReadStream(animatedVideoPath), {
                filename: 'animated_video.mp4',
                contentType: 'video/mp4',
            });
            processFormData.append('audio', fs.createReadStream(path.join(extractDir, audioFile)), {
                filename: audioFile,
                contentType: 'audio/wav',
            });

            const processResponse = await axios.post(
                'https://0c35-34-90-10-160.ngrok-free.app/process',
                processFormData,
                {
                    headers: processFormData.getHeaders(),
                    responseType: 'arraybuffer',
                }
            );

            await fsPromises.writeFile(finalVideoPath, Buffer.from(processResponse.data));

            const finalVideoBuffer = await fsPromises.readFile(finalVideoPath);
            const finalVideoFilePath = `${uniqueFolderName}/slide_${slideNumber}.mp4`;
            const { publicUrl } = await uploadFileToSupabase('ppt-video', finalVideoFilePath, finalVideoBuffer);
            videoUrls.push(publicUrl);
        }

        return { videoUrls };
    } finally {
        if (zipFilePath) await retryDelete(zipFilePath);
        if (animatedVideoPath) await retryDelete(animatedVideoPath);
        if (extractDir) await retryDelete(extractDir);
        for (const videoPath of finalVideoPaths) {
            if (videoPath) await retryDelete(videoPath);
        }
    }
}

// ### API Endpoints

// Process PPT and image simultaneously
app.post('/process-all', upload.fields([
    { name: 'ppt', maxCount: 1 },
    { name: 'image', maxCount: 1 },
]), async (req, res) => {
    let pptPath, imagePath;
    try {
        if (!req.files || !req.files['ppt'] || !req.files['image']) {
            return res.status(400).json({ success: false, message: "Both PPT and Image files are required." });
        }

        pptPath = req.files['ppt'][0].path;
        imagePath = req.files['image'][0].path;

        // Run both pipelines simultaneously
        const [imageResult, videoResult] = await Promise.all([
            processPPTToImages(pptPath),
            processPPTToVideo(pptPath, imagePath)
        ]);

        res.json({
            success: true,
            imageFolder: imageResult.folderName,
            imageUrls: imageResult.imageUrls,
            videoUrls: videoResult.videoUrls
        });
    } catch (error) {
        console.error("Error processing files:", error);
        res.status(500).json({ success: false, message: "Error processing files", error: error.message });
    } finally {
        if (pptPath) await retryDelete(pptPath);
        if (imagePath) await retryDelete(imagePath);
    }
});

// Get images from Supabase by folder name
app.get("/images/:folderName", async (req, res) => {
    try {
        const { folderName } = req.params;
        const { data: files, error } = await supabase.storage
            .from("ppt-images")
            .list(folderName);

        if (error) throw error;

        files.sort((a, b) => {
            const aNumber = parseInt(a.name.match(/\d+/)[0], 10);
            const bNumber = parseInt(b.name.match(/\d+/)[0], 10);
            return aNumber - bNumber;
        });

        const imageUrls = files.map((file) => {
            return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/ppt-images/${folderName}/${file.name}`;
        });

        res.json({
            success: true,
            imageUrls,
        });
    } catch (error) {
        console.error("Error fetching images:", error);
        res.status(500).json({ success: false, message: "Error fetching images", error: error.message });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
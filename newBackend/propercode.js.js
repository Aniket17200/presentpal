require("dotenv").config(); // Load environment variables
const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs").promises;
const path = require("path");
const cors = require("cors");
const shell = require("shelljs");
const poppler = require("pdf-poppler"); // Use pdf-poppler for PDF to image conversion

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

// Ensure uploads directory exists
const uploadDir = "uploads";
fs.mkdir(uploadDir, { recursive: true })
  .then(() => console.log("Uploads directory is ready."))
  .catch((err) => console.error("Error creating uploads directory:", err));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tempDir = path.join(uploadDir, `temp-${Date.now()}`);
    fs.mkdir(tempDir, { recursive: true })
      .then(() => cb(null, tempDir))
      .catch((err) => cb(err, null));
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});
const upload = multer({ storage });

// Add LibreOffice to PATH
process.env.PATH += `;C:\\Program Files\\LibreOffice\\program`;

// Helper: Convert PPT to PDF
const convertToPDF = (file, ext) => {
  return new Promise((resolve, reject) => {
    const office = process.env.PPT_TO_PDF_PATH || "soffice";
    const outdir = path.dirname(file);

    if ([".ppt", ".pptx", ".pps", ".ppsx"].includes(ext)) {
      const command = `"${office}" --headless --convert-to pdf --outdir "${outdir}" "${file}"`;
      console.log("Running command:", command);
      shell.exec(command, { silent: true }, (code, stdout, stderr) => {
        if (code !== 0) {
          reject(new Error(`Conversion failed: ${stderr}`));
        } else {
          const pdfPath = file.replace(ext, ".pdf");
          console.log("PDF saved locally at:", pdfPath);
          resolve(pdfPath);
        }
      });
    } else {
      reject(new Error("Invalid file type for conversion."));
    }
  });
};

// Helper: Convert PDF to images using pdf-poppler
const convertPDFToImages = async (pdfPath) => {
  try {
    const outputDir = path.dirname(pdfPath);
    const outputPrefix = path.join(outputDir, "page");

    const opts = {
      format: "png", // Output image format
      out_dir: outputDir, // Output directory for images
      out_prefix: path.basename(outputPrefix), // Prefix for generated image files
      page: null, // Convert all pages
    };

    // Convert PDF to images
    await poppler.convert(pdfPath, opts);
    console.log("PDF converted to images");

    // Get the list of generated images
    const files = await fs.readdir(outputDir);
    const images = files
      .filter((file) => file.startsWith("page") && file.endsWith(".png"))
      .map((file) => path.join(outputDir, file));

    return images;
  } catch (error) {
    console.error("Error converting PDF to images:", error);
    throw error;
  }
};

// Helper: Upload file to Supabase
const uploadToSupabase = async (bucketName, filePath, destinationPath, contentType) => {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(destinationPath, fileBuffer, { contentType, upsert: true });

    if (error) throw error;
    console.log("Upload successful:", data);
    return data;
  } catch (err) {
    console.error("Error uploading to Supabase:", err);
    throw err;
  }
};

// Helper: Retry file deletion
const retryDelete = async (filePath, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await fs.rm(filePath, { force: true, recursive: true });
      console.log("File deleted successfully:", filePath);
      return;
    } catch (err) {
      console.warn(`Attempt ${i + 1}: Error deleting file`, filePath, err);
      if (i < retries - 1) await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  console.error("Failed to delete file after retries:", filePath);
};

// API: Upload PPT, convert to PDF, and then convert PDF to images
app.post("/upload", upload.single("ppt"), async (req, res) => {
  let pptPath, pdfPath, tempDir;

  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    pptPath = path.resolve(req.file.path);
    tempDir = path.dirname(pptPath); // Temporary directory created by multer
    const ext = path.extname(req.file.originalname);
    const originalName = path.basename(req.file.originalname, ext);

    console.log("Received file:", req.file.originalname);
    console.log("Temporary PPT file saved at:", pptPath);

    // Convert PPT to PDF
    pdfPath = await convertToPDF(pptPath, ext);
    await fs.access(pdfPath); // Verify PDF file existence
    const stats = await fs.stat(pdfPath);
    console.log(`PDF file size: ${stats.size} bytes`);

    // Convert PDF to images
    const images = await convertPDFToImages(pdfPath);
    console.log("PDF converted to images:", images);

    // Create a unique folder for this PDF's images in the Supabase bucket
    const folderName = `pdf-${Date.now()}-${originalName}`;
    console.log("Folder name for Supabase upload:", folderName); // Log the folder name
    const imageUrls = [];

    // Upload images to Supabase
    for (let i = 0; i < images.length; i++) {
      const imagePath = images[i];
      const imageFileName = `${folderName}/image-${i + 1}.png`; // Store images in the folder
      console.log("Uploading image:", imageFileName); // Log the image file name
      const imageUploadData = await uploadToSupabase("ppt-images", imagePath, imageFileName, "image/png");
      imageUrls.push(`${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/ppt-images/${imageUploadData.path}`);
    }

    console.log("Images uploaded to Supabase:", imageUrls);

    res.json({
      success: true,
      folderName, // Return the folder name for future reference
      imageUrls,
    });
  } catch (error) {
    console.error("Error processing PPT:", error);
    res.status(500).json({ success: false, message: "Error processing PPT", error: error.message });
  } finally {
    // Cleanup local files
    if (pptPath) await retryDelete(pptPath);
    if (pdfPath) await retryDelete(pdfPath);
    if (tempDir) await retryDelete(tempDir); // Delete the entire temporary directory
  }
});

// API: Get images from Supabase by folder name in sorted order
app.get("/images/:folderName", async (req, res) => {
  try {
    const { folderName } = req.params;
    console.log("Fetching images for folder:", folderName); // Log the folder name

    // List all files in the folder
    const { data: files, error } = await supabase.storage
      .from("ppt-images")
      .list(folderName);

    if (error) throw error;

    console.log("Files in folder:", files); // Log the files in the folder

    // Sort files by name
    files.sort((a, b) => {
      const aNumber = parseInt(a.name.match(/\d+/)[0], 10); // Extract number from filename
      const bNumber = parseInt(b.name.match(/\d+/)[0], 10); // Extract number from filename
      return aNumber - bNumber; // Sort in ascending order
    });

    console.log("Sorted files in folder:", files); // Log the sorted files

    // Generate public URLs for the images
    const imageUrls = files.map((file) => {
      return `${process.env.VITE_SUPABASE_URL}/storage/v1/object/public/ppt-images/${folderName}/${file.name}`;
    });

    console.log("Generated image URLs:", imageUrls); // Log the generated image URLs

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
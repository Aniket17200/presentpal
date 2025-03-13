require("dotenv").config();
const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const fsPromises = fs.promises;
const path = require("path");
const cors = require("cors");
const shell = require("shelljs");
const poppler = require("pdf-poppler");
const sanitize = require("sanitize-filename");
const axios = require("axios");
const FormData = require("form-data");
const { v4: uuidv4 } = require("uuid");
const unzipper = require("unzipper");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

// API URLs
const AUDIO_API_URL = process.env.AUDIO_API_URL;
const ANIMATION_API_URL = process.env.ANIMATION_API_URL;
const PROCESS_API_URL = process.env.PROCESS_API_URL ; // Updated URL

// Task storage (in-memory; use a database for production)
const tasks = new Map();
const finalVideoTasks = new Map();

// Ensure directories exist
const uploadDir = "uploads";
const pptStorageDir = "ppt_storage";
Promise.all([
  fsPromises.mkdir(uploadDir, { recursive: true }).then(() => console.log("Uploads directory is ready.")),
  fsPromises.mkdir(pptStorageDir, { recursive: true }).then(() => console.log("PPT storage directory is ready.")),
]).catch((err) => console.error("Error creating directories:", err));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempDir = path.join(uploadDir, `temp-${Date.now()}`);
    try {
      await fsPromises.mkdir(tempDir, { recursive: true });
      console.log(`Temporary directory created: ${tempDir}`);
      cb(null, tempDir);
    } catch (err) {
      console.error("Error creating temp directory:", err);
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    console.log(`Received file: ${file.originalname}`);
    cb(null, file.originalname);
  },
});
const upload = multer({ storage }).fields([
  { name: "ppt", maxCount: 1 },
  { name: "userImage", maxCount: 1 },
]);

// **Helper Functions**

const checkLibreOffice = () => {
  const office = process.env.PPT_TO_PDF_PATH || "soffice";
  if (!shell.which(office)) {
    throw new Error("LibreOffice is not installed or not in PATH.");
  }
  console.log("LibreOffice found in PATH.");
  return office;
};

const convertToPDF = (file, ext) => {
  return new Promise((resolve, reject) => {
    const office = checkLibreOffice();
    const outdir = path.dirname(file);
    if (![".ppt", ".pptx", ".pps", ".ppsx"].includes(ext)) {
      return reject(new Error("Invalid file type. Only PPT files are allowed."));
    }
    const command = `"${office}" --headless --convert-to pdf --outdir "${outdir}" "${file}"`;
    console.log(`Executing PPT to PDF conversion: ${command}`);
    shell.exec(command, { silent: true }, (code, stdout, stderr) => {
      if (code !== 0) {
        console.error(`Conversion failed: ${stderr}`);
        reject(new Error(`Conversion failed: ${stderr}`));
      } else {
        const pdfPath = file.replace(ext, ".pdf");
        console.log(`PDF generated: ${pdfPath}`);
        resolve(pdfPath);
      }
    });
  });
};

const convertPDFToImages = async (pdfPath) => {
  const outputDir = path.dirname(pdfPath);
  const outputPrefix = path.join(outputDir, "page");
  const opts = {
    format: "png",
    out_dir: outputDir,
    out_prefix: path.basename(outputPrefix),
    page: null,
  };
  console.log(`Converting PDF to images: ${pdfPath}`);
  try {
    await poppler.convert(pdfPath, opts);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const files = await fsPromises.readdir(outputDir);
    const images = files
      .filter((file) => file.startsWith("page") && file.endsWith(".png"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/page-(\d+)\.png/)[1], 10);
        const numB = parseInt(b.match(/page-(\d+)\.png/)[1], 10);
        return numA - numB;
      })
      .map((file) => path.join(outputDir, file));
    console.log(`Generated images: ${images.length} files`);
    return images;
  } catch (err) {
    console.error("Error converting PDF to images:", err);
    throw err;
  }
};

const uploadToSupabase = async (bucketName, filePath, destinationPath, contentType, retries = 3) => {
  const fileBuffer = await fsPromises.readFile(filePath);
  console.log(`Uploading to Supabase: ${destinationPath}`);
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(destinationPath, fileBuffer, { contentType, upsert: true });
      if (error) throw error;
      console.log(`Uploaded to Supabase: ${destinationPath}`);
      return data;
    } catch (err) {
      console.error(`Supabase upload attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

const uploadBufferToSupabase = async (buffer, bucketName, destinationPath, contentType, retries = 3) => {
  console.log(`Uploading buffer to Supabase: ${destinationPath}`);
  for (let i = 0; i < retries; i++) {
    try {
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(destinationPath, buffer, { contentType, upsert: true });
      if (error) throw error;
      console.log(`Uploaded to Supabase: ${destinationPath}`);
      return data;
    } catch (err) {
      console.error(`Supabase buffer upload attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i === retries - 1) throw err;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

const retryDelete = async (filePath, retries = 5, delay = 2000) => {
  for (let i = 0; i < retries; i++) {
    try {
      await fsPromises.rm(filePath, { force: true, recursive: true });
      console.log(`Deleted: ${filePath}`);
      return;
    } catch (err) {
      if (i === retries - 1) {
        console.error(`Failed to delete after retries: ${filePath}`, err);
        return;
      }
      console.warn(`Retrying deletion of ${filePath} (${i + 1}/${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

const savePptCopy = async (pptPath, originalName, ext) => {
  const pptCopyPath = path.join(pptStorageDir, `${sanitize(originalName)}-${Date.now()}${ext}`);
  await fsPromises.copyFile(pptPath, pptCopyPath);
  console.log(`PPT copy saved locally: ${pptCopyPath}`);
  return pptCopyPath;
};

const uploadPptToSupabase = async (pptPath, originalName, ext, folderName) => {
  const pptFileName = `${folderName}/ppt-${originalName}${ext}`;
  const pptUploadData = await uploadToSupabase(
    "ppt-files",
    pptPath,
    pptFileName,
    "application/vnd.openxmlformats-officedocument.presentationml.presentation"
  );
  const pptUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/ppt-files/${pptUploadData.path}`;
  console.log(`PPT uploaded to Supabase: ${pptUrl}`);
  return pptUrl;
};

const uploadPdfToSupabase = async (pdfPath, originalName, folderName) => {
  const pdfFileName = `${folderName}/pdf-${originalName}.pdf`;
  const pdfUploadData = await uploadToSupabase("ppt-pdfs", pdfPath, pdfFileName, "application/pdf");
  const pdfUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/ppt-pdfs/${pdfUploadData.path}`;
  console.log(`PDF uploaded to Supabase: ${pdfUrl}`);
  return pdfUrl;
};

const uploadUserImageToSupabase = async (imagePath, originalName, ext, folderName) => {
  const imageFileName = `${folderName}/user-image-${originalName}${ext}`;
  const imageUploadData = await uploadToSupabase("user-images", imagePath, imageFileName, "image/" + ext.slice(1));
  const imageUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/user-images/${imageUploadData.path}`;
  console.log(`User image uploaded to Supabase: ${imageUrl}`);
  return imageUrl;
};

const downloadFile = async (url, destPath) => {
  const response = await axios.get(url, { responseType: "stream" });
  const writer = fs.createWriteStream(destPath);
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on("finish", resolve);
    writer.on("error", reject);
  });
};

const extractZip = async (zipPath, extractTo) => {
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: extractTo }))
    .promise();
};

const generateFinalVideo = async (videoPath, audioPath) => {
  const form = new FormData();
  form.append("video", fs.createReadStream(videoPath), {
    filename: "animation.mp4",
    contentType: "video/mp4",
  });
  form.append("audio", fs.createReadStream(audioPath), {
    filename: path.basename(audioPath),
    contentType: "audio/wav",
  });

  console.log(`Sending request to ${PROCESS_API_URL} with video: ${videoPath} and audio: ${audioPath}`);
  const response = await axios.post(PROCESS_API_URL, form, {
    headers: form.getHeaders(),
    responseType: "arraybuffer",
    timeout: 180000, // 3-minute timeout as per your observation
  });
  console.log(`Response received from ${PROCESS_API_URL}`);
  return response.data;
};

const generateFinalVideos = async (audioZipUrl, animationVideoUrl, folderName) => {
  const pLimit = (await import("p-limit")).default;
  const tempDir = path.join(uploadDir, `temp-videos-${Date.now()}`);
  await fsPromises.mkdir(tempDir, { recursive: true });

  try {
    console.log(`Downloading audio ZIP from: ${audioZipUrl}`);
    const audioZipPath = path.join(tempDir, "audio.zip");
    await downloadFile(audioZipUrl, audioZipPath);
    console.log(`Audio ZIP downloaded to: ${audioZipPath}`);

    const audioExtractDir = path.join(tempDir, "audio");
    console.log(`Extracting ZIP to: ${audioExtractDir}`);
    await extractZip(audioZipPath, audioExtractDir);
    console.log(`ZIP extracted to: ${audioExtractDir}`);

    const audioFiles = await fsPromises.readdir(audioExtractDir);
    console.log(`Files in extracted directory: ${audioFiles}`);

    const audioPaths = audioFiles
      .filter((file) => file.endsWith(".wav"))
      .sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.wav/)?.[1] || 0, 10);
        const numB = parseInt(b.match(/slide(\d+)\.wav/)?.[1] || 0, 10);
        return numA - numB;
      })
      .map((file) => path.join(audioExtractDir, file));

    console.log(`Found ${audioPaths.length} audio files: ${audioPaths}`);
    if (audioPaths.length === 0) {
      throw new Error("No .wav audio files found in the ZIP.");
    }

    console.log(`Downloading animation video from: ${animationVideoUrl}`);
    const animationVideoPath = path.join(tempDir, "animation.mp4");
    await downloadFile(animationVideoUrl, animationVideoPath);
    console.log(`Animation video downloaded to: ${animationVideoPath}`);

    const limit = pLimit(3); // Limit to 2 concurrent requests to PROCESS_API_URL
    const videoPromises = audioPaths.map((audioPath, i) =>
      limit(async () => {
        console.log(`Generating final video for slide ${i + 1} with audio: ${audioPath}`);
        const finalVideoBuffer = await generateFinalVideo(animationVideoPath, audioPath);
        const videoFileName = `${folderName}/final-video-slide${i + 1}.mp4`;
        console.log(`Uploading final video to Supabase: ${videoFileName}`);
        const videoUrlData = await uploadBufferToSupabase(
          finalVideoBuffer,
          "ppt-video",
          videoFileName,
          "video/mp4"
        );
        const videoUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/ppt-video/${videoUrlData.path}`;
        console.log(`Final video uploaded: ${videoUrl}`);
        return videoUrl;
      })
    );

    const videoUrls = await Promise.all(videoPromises);
    console.log(`Final videos generated and uploaded: ${videoUrls.join(", ")}`);
    return videoUrls;
  } catch (error) {
    console.error("Error generating final videos:", error);
    throw error;
  } finally {
    await retryDelete(tempDir);
  }
};

const retryWithDelay = async (fn, maxAttempts = 12, delayMs = 5000) => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await fn();
      return result;
    } catch (error) {
      if (attempt === maxAttempts || (error.response && error.response.status >= 500)) {
        throw error;
      }
      console.log(`Attempt ${attempt}/${maxAttempts} failed (${error.message}), retrying in ${delayMs / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
};

const generateAudioAsync = async (pptPath, taskId, folderName) => {
  tasks.set(taskId, { status: "processing", audioUrl: null });
  const form = new FormData();
  form.append("file", fs.createReadStream(pptPath), {
    filename: path.basename(pptPath),
    contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });

  const fetchAudio = async () => {
    const response = await axios.post(AUDIO_API_URL, form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer",
      timeout: 120000,
    });
    console.log(`Audio API response received for task ${taskId}`);
    const contentType = response.headers["content-type"];
    if (!contentType || !contentType.includes("application/zip")) {
      throw new Error(`Unexpected response type: ${contentType}. Expected application/zip`);
    }
    return response.data;
  };

  try {
    console.log(`Starting async audio generation for task ${taskId}`);
    const audioBuffer = await retryWithDelay(fetchAudio);
    const audioUrlData = await uploadBufferToSupabase(
      audioBuffer,
      "ppt-audio",
      `${folderName}/${folderName}-audio.zip`,
      "application/zip"
    );
    const audioUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/ppt-audio/${audioUrlData.path}`;
    tasks.set(taskId, { status: "completed", audioUrl });
    console.log(`Audio generation completed for task ${taskId}: ${audioUrl}`);
    return audioUrl;
  } catch (error) {
    console.error(`Error in async audio generation for task ${taskId}:`, error.message);
    tasks.set(taskId, { status: "failed", audioUrl: null, error: error.message });
    throw error;
  }
};

const generateAnimationAsync = async (imagePath, taskId, folderName) => {
  tasks.set(taskId, { status: "processing", animationVideoUrl: null });
  const form = new FormData();
  form.append("image", fs.createReadStream(imagePath), {
    filename: path.basename(imagePath),
    contentType: `image/${path.extname(imagePath).slice(1).toLowerCase()}`,
  });

  const fetchAnimation = async () => {
    const response = await axios.post(ANIMATION_API_URL, form, {
      headers: form.getHeaders(),
      responseType: "arraybuffer",
      timeout: 120000,
    });
    console.log(`Animation API response received for task ${taskId}`);
    const contentType = response.headers["content-type"];
    if (!contentType || !contentType.includes("video/mp4")) {
      throw new Error(`Unexpected response type: ${contentType}. Expected video/mp4`);
    }
    return response.data;
  };

  try {
    console.log(`Starting async animation generation for task ${taskId}`);
    const videoBuffer = await retryWithDelay(fetchAnimation);
    const videoUrlData = await uploadBufferToSupabase(
      videoBuffer,
      "animate-video",
      `${folderName}/${folderName}-animation.mp4`,
      "video/mp4"
    );
    const videoUrl = `${process.env.SUPABASE_URL}/storage/v1/object/public/animate-video/${videoUrlData.path}`;
    tasks.set(taskId, { status: "completed", animationVideoUrl: videoUrl });
    console.log(`Animation generation completed for task ${taskId}: ${videoUrl}`);
    return videoUrl;
  } catch (error) {
    console.error(`Error in async animation generation for task ${taskId}:`, error.message);
    tasks.set(taskId, { status: "failed", animationVideoUrl: null, error: error.message });
    throw error;
  }
};

// **API Endpoints**

app.post("/upload", upload, async (req, res) => {
  let pptPath, pdfPath, tempDir, pptCopyPath, userImagePath;
  try {
    if (!req.files || !req.files["ppt"]) {
      console.log("No PPT file uploaded.");
      return res.status(400).json({ success: false, message: "No PPT file uploaded." });
    }

    const pptFile = req.files["ppt"][0];
    const ext = path.extname(pptFile.originalname).toLowerCase();
    if (![".ppt", ".pptx", ".pps", ".ppsx"].includes(ext)) {
      console.log(`Invalid PPT file type: ${ext}`);
      return res.status(400).json({ success: false, message: "Invalid PPT file type." });
    }

    pptPath = path.resolve(pptFile.path);
    tempDir = path.dirname(pptPath);
    const originalName = sanitize(path.basename(pptFile.originalname, ext));
    const folderName = `ppt-${Date.now()}-${originalName}`;

    // Initialize final video task status
    finalVideoTasks.set(folderName, { status: "pending", videoUrls: [] });

    let userImageUrl = null;
    let animationTaskId = null;
    const audioTaskId = uuidv4();

    if (req.files["userImage"]) {
      const userImageFile = req.files["userImage"][0];
      const userImageExt = path.extname(userImageFile.originalname).toLowerCase();
      userImagePath = path.resolve(userImageFile.path);
      userImageUrl = await uploadUserImageToSupabase(userImagePath, originalName, userImageExt, folderName);
      animationTaskId = uuidv4();
    }

    pptCopyPath = await savePptCopy(pptPath, originalName, ext);
    const pptUrl = await uploadPptToSupabase(pptPath, originalName, ext, folderName);
    pdfPath = await convertToPDF(pptPath, ext);
    await fsPromises.access(pdfPath);
    const pdfUrl = await uploadPdfToSupabase(pdfPath, originalName, folderName);
    const images = await convertPDFToImages(pdfPath);

    const uploadPromises = images.map((imagePath, i) => {
      const imageFileName = `${folderName}/image-${i + 1}.png`;
      return uploadToSupabase("ppt-images", imagePath, imageFileName, "image/png").then((data) =>
        `${process.env.SUPABASE_URL}/storage/v1/object/public/ppt-images/${data.path}`
      );
    });
    const imageUrls = await Promise.all(uploadPromises);
    console.log(`Image URLs generated: ${imageUrls.length} URLs`);

    const audioPromise = generateAudioAsync(pptPath, audioTaskId, folderName).catch((err) => {
      console.error(`Background audio task ${audioTaskId} failed:`, err);
      return null;
    });
    const animationPromise = userImagePath
      ? generateAnimationAsync(userImagePath, animationTaskId, folderName).catch((err) => {
          console.error(`Background animation task ${animationTaskId} failed:`, err);
          return null;
        })
      : Promise.resolve(null);

    // Background process for final video generation
    (async () => {
      const [audioUrl, animationVideoUrl] = await Promise.all([audioPromise, animationPromise]);
      if (audioUrl && animationVideoUrl) {
        finalVideoTasks.set(folderName, { status: "processing", videoUrls: [] });
        try {
          const videoUrls = await generateFinalVideos(audioUrl, animationVideoUrl, folderName);
          finalVideoTasks.set(folderName, { status: "completed", videoUrls });
        } catch (err) {
          console.error("Final video generation failed in background:", err);
          finalVideoTasks.set(folderName, { status: "failed", videoUrls: [], error: err.message });
        }
      } else {
        console.log("Skipping final video generation due to missing audio or animation.");
        finalVideoTasks.set(folderName, { status: "skipped", videoUrls: [] });
      }
    })();

    // Send initial response immediately
    res.json({
      success: true,
      folderName,
      imageUrls,
      pptUrl,
      pdfUrl,
      userImageUrl,
      audioTaskId,
      animationTaskId,
    });
  } catch (error) {
    console.error("Error processing PPT:", error);
    res.status(500).json({ success: false, message: "Error processing PPT", error: error.message });
  } finally {
    await Promise.all([
      pptPath && retryDelete(pptPath),
      pdfPath && retryDelete(pdfPath),
      userImagePath && retryDelete(userImagePath),
      tempDir && retryDelete(tempDir),
    ].filter(Boolean));
  }
});

app.get("/status/:taskId", (req, res) => {
  const taskId = req.params.taskId;
  const task = tasks.get(taskId);
  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }
  res.json({
    success: true,
    taskId,
    status: task.status,
    audioUrl: task.audioUrl || null,
    animationVideoUrl: task.animationVideoUrl || null,
    error: task.error || null,
  });
});

// Endpoint to check final video generation status
app.get("/status/final-videos/:folderName", (req, res) => {
  const folderName = req.params.folderName;
  const task = finalVideoTasks.get(folderName);
  if (!task) {
    return res.status(404).json({ success: false, message: "Task not found" });
  }
  res.json({
    success: true,
    folderName,
    status: task.status,
    videoUrls: task.videoUrls || [],
    error: task.error || null,
  });
});

// Start server
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
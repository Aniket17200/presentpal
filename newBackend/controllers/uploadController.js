const { generateAudioAsync } = require("../services/audioService");
const { generateAnimationAsync } = require("../services/animationService");
const { savePptCopy, uploadPptToSupabase, uploadPdfToSupabase, uploadUserImageToSupabase } = require("../services/fileService");
const { convertToPDF, convertPDFToImages, retryDelete } = require("../utils/commonUtils");
const { uploadToSupabase } = require("../utils/apiUtils");
const path = require("path");
const fsPromises = require("fs").promises;
const { v4: uuidv4 } = require("uuid");
const { finalVideoTasks } = require("../services/taskService");
const { generateFinalVideos } = require("../services/videoService");

const uploadController = async (req, res) => {
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
    const originalName = path.basename(pptFile.originalname, ext).replace(/[^a-zA-Z0-9]/g, "_");
    const folderName = `ppt-${Date.now()}-${originalName}`;

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
};

module.exports = uploadController;
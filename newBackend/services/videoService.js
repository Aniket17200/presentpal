const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const fsPromises = fs.promises; // Added missing import
const path = require("path");
const { uploadBufferToSupabase } = require("../utils/apiUtils");
const { downloadFile, extractZip, retryDelete } = require("../utils/commonUtils");
const { PROCESS_API_URL } = require("../config/constants");

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
    timeout: 180000,
  });
  console.log(`Response received from ${PROCESS_API_URL}`);
  return response.data;
};

const generateFinalVideos = async (audioZipUrl, animationVideoUrl, folderName) => {
  const pLimit = (await import("p-limit")).default;
  const tempDir = path.join("uploads", `temp-videos-${Date.now()}`);
  await fsPromises.mkdir(tempDir, { recursive: true }); // Now fsPromises is defined

  try {
    console.log(`Downloading audio ZIP from: ${audioZipUrl}`);
    const audioZipPath = path.join(tempDir, "audio.zip");
    await downloadFile(audioZipUrl, audioZipPath);
    console.log(`Audio ZIP downloaded to: ${audioZipPath}`);

    const audioExtractDir = path.join(tempDir, "audio");
    console.log(`Extracting ZIP to: ${audioExtractDir}`);
    await extractZip(audioZipPath, audioExtractDir);
    console.log(`ZIP extracted to: ${audioExtractDir}`);

    const audioFiles = await fsPromises.readdir(audioExtractDir); // Updated
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

    const limit = pLimit(3);
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

module.exports = {
  generateFinalVideos,
};
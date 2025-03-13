const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { tasks } = require("./taskService");
const { uploadBufferToSupabase, retryWithDelay } = require("../utils/apiUtils");
const { ANIMATION_API_URL } = require("../config/constants");

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

module.exports = {
  generateAnimationAsync,
};
const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { tasks } = require("./taskService");
const { uploadBufferToSupabase, retryWithDelay } = require("../utils/apiUtils");
const { AUDIO_API_URL } = require("../config/constants");

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

module.exports = {
  generateAudioAsync,
};
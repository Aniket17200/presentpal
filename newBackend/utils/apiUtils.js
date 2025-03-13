const supabase = require("../config/supabase");
const fsPromises = require("fs").promises;

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

module.exports = {
  uploadToSupabase,
  uploadBufferToSupabase,
  retryWithDelay,
};
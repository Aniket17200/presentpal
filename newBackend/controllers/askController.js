const axios = require("axios");
const fs = require("fs").promises; // Import fs.promises for async file operations
const path = require("path");
const supabase = require("../config/supabase");
require("dotenv").config();

const FLASK_API_URL = process.env.FLASK_API_URL;
const TEMP_DIR = path.join(__dirname, "../temp"); // Define temp directory path

exports.askQuestion = async (req, res) => {
    const { question } = req.body;
    if (!question) return res.status(400).json({ error: "Question required" });

    let tempFileName = "";
    const startTime = Date.now();

    try {
        // Validate Flask response
        const flaskResponse = await axios.post(
            `${FLASK_API_URL}/ask`,
            { question },
            { 
                responseType: "arraybuffer",
                timeout: 30000 // 10-second timeout
            }
        );

        if (!flaskResponse.data || flaskResponse.status !== 200) {
            throw new Error(`Invalid Flask response: ${flaskResponse.status}`);
        }

        // Generate unique filename
        tempFileName = `audio_${startTime}_${Math.floor(Math.random() * 1000)}.mp3`;
        const tempPath = path.join(TEMP_DIR, tempFileName);
        
        // Write temp file
        await fs.writeFile(tempPath, flaskResponse.data); // Use fs.promises.writeFile
        console.log(`Temp file created: ${tempFileName} (${flaskResponse.data.byteLength} bytes)`);

        // Supabase upload
        const fileBuffer = await fs.readFile(tempPath); // Use fs.promises.readFile
        const supabasePath = `audios/${tempFileName}`;
        
        const { error } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .upload(supabasePath, fileBuffer, {
                contentType: "audio/mpeg",
                upsert: true,
                cacheControl: "3600"
            });

        if (error) throw new Error(`Supabase upload failed: ${error.message}`);

        // Get public URL
        const { data: { publicUrl } } = await supabase.storage
            .from(process.env.SUPABASE_BUCKET)
            .getPublicUrl(supabasePath);

        if (!publicUrl) throw new Error("Failed to generate public URL");

        console.log(`Processing completed in ${Date.now() - startTime}ms`);
        return res.json({ 
            audioUrl: publicUrl,
            timestamp: startTime
        });

    } catch (error) {
        console.error(`Error processing "${question}":`, error);
        return res.status(500).json({
            error: error.message,
            stack: process.env.NODE_ENV === "development" ? error.stack : undefined
        });
    } finally {
        if (tempFileName) {
            fs.unlink(path.join(TEMP_DIR, tempFileName))
                .catch(cleanupError => 
                    console.error(`Cleanup failed for ${tempFileName}:`, cleanupError)
                );
        }
    }
};
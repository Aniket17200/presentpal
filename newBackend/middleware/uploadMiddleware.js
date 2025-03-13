const multer = require("multer");
const path = require("path");
const fsPromises = require("fs").promises;

const uploadDir = "uploads";

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

module.exports = upload;
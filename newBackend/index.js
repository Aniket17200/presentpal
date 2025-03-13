//index.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const uploadRoutes = require("./routes/uploadRoutes");
const statusRoutes = require("./routes/statusRoutes");
const authRoutes = require("./routes/authRoutes");
const fsPromises = require("fs").promises;
const path = require("path");
const askRoutes = require("./routes/askRoutes");
const { createDirectories } = require("./utils/fileUtils");

const app = express();
const PORT = 5100; // Updated to match frontend

const uploadDir = "uploads";
const pptStorageDir = "ppt_storage";
createDirectories();

console.log('Starting server setup');

Promise.all([
  fsPromises.mkdir(uploadDir, { recursive: true }).then(() => console.log("Uploads directory is ready.")),
  fsPromises.mkdir(pptStorageDir, { recursive: true }).then(() => console.log("PPT storage directory is ready.")),
]).catch((err) => console.error("Error creating directories:", err));

app.use(cors());
app.use(express.json());

console.log('Mounting routes');
app.use("/api/auth", authRoutes); // Updated to /api/auth
app.use("/", uploadRoutes);       // Keep existing routes as-is
app.use("/", statusRoutes);
app.use("/", askRoutes);

app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
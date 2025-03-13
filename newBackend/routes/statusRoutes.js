const express = require("express");
const { getTaskStatus, getFinalVideoStatus } = require("../controllers/statusController");

const router = express.Router();

router.get("/status/:taskId", getTaskStatus);
router.get("/status/final-videos/:folderName", getFinalVideoStatus);

module.exports = router;
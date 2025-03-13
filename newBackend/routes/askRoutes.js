const express = require("express");
const router = express.Router();
const { askQuestion } = require("../controllers/askController");
const validateQuestion = require("../middleware/validateQuestion");

// Validation middleware
router.use(express.json());
router.post("/ask", 
    validateQuestion,
    askQuestion
);

module.exports = router;
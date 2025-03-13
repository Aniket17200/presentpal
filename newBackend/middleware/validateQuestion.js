module.exports = (req, res, next) => {
    const { question } = req.body;
    
    if (!question || typeof question !== "string") {
        return res.status(400).json({ error: "Invalid question format" });
    }
    
    if (question.length > 500) {
        return res.status(400).json({ error: "Question exceeds 500 characters" });
    }

    next();
};
//middleware/authMiddleware.js
const supabase = require('../config/supabase');

// Authenticate User: Verifies token and sets req.user
const authenticateUser = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    try {
        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Authentication error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Require Email Verification: Ensures email is verified for protected routes
const requireEmailVerification = (req, res, next) => {
    if (!req.user.email_confirmed_at) {
        return res.status(403).json({ error: 'Please verify your email to access this resource' });
    }
    next();
};

module.exports = { authenticateUser, requireEmailVerification };
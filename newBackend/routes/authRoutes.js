const express = require('express');
const { signup, login, forgotPassword, resetPassword } = require('../controllers/authController');
const router = express.Router();

console.log('Setting up auth routes under /api/auth');

router.post('/signup', (req, res) => {
    console.log('Route: POST /api/auth/signup triggered');
    signup(req, res);
});

router.post('/login', (req, res) => {
    console.log('Route: POST /api/auth/login triggered');
    login(req, res);
});

router.post('/forgot-password', (req, res) => {
    console.log('Route: POST /api/auth/forgot-password triggered');
    forgotPassword(req, res);
});

router.post('/reset-password', (req, res) => {
    console.log('Route: POST /api/auth/reset-password triggered');
    resetPassword(req, res);
});

module.exports = router;
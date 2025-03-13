const supabase = require('../config/supabase');

// Signup: Sends verification email, does not log in user immediately
const signup = async (req, res) => {
    const { email, password, name } = req.body;
    console.log('Signup request received:', { email, name });

    // Input validation
    if (!email || !password || !name) {
        console.log('Signup validation failed: Missing email, password, or name');
        return res.status(400).json({ error: 'Email, password, and name are required' });
    }

    try {
        console.log('Attempting Supabase signup for:', email);
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { name },
                emailRedirectTo: `${process.env.FRONTEND_URL}/verify-email`,
            },
        });

        if (error) {
            console.log('Signup failed with error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        console.log('Signup successful for user:', data.user.id);
        res.status(201).json({
            message: 'Signup successful. Please check your email to verify your account.',
            data: { session: null, user: data.user }, // Matches frontend expectation
        });
    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

// Login: Allows login only if email is verified
const login = async (req, res) => {
    const { email, password } = req.body;
    console.log('Login request received:', { email });

    if (!email || !password) {
        console.log('Login validation failed: Missing email or password');
        return res.status(400).json({ error: 'Email and password are required' });
    }

    try {
        console.log('Attempting Supabase login for:', email);
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.log('Login failed with error:', error.message);
            return res.status(400).json({ error: error.message });
        }

        if (!data.user.email_confirmed_at) {
            console.log('Login rejected: Email not verified for:', email);
            return res.status(403).json({ error: 'Please verify your email before logging in' });
        }

        console.log('Login successful for user:', data.user.id);
        res.status(200).json({
            message: 'Login successful',
            data: {
                session: data.session,
                user: data.user,
            },
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const forgotPassword = async (req, res) => {
    const { email } = req.body;
    console.log('Forgot password request received:', { email });

    if (!email) {
        console.log('Forgot password validation failed: Missing email');
        return res.status(400).json({ error: 'Email is required' });
    }

    try {
        console.log('Sending password reset email for:', email);
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${process.env.FRONTEND_URL}/reset-password`,
        });

        if (error) {
            console.error('Forgot password error:', error);
            return res.status(400).json({ error: error.message });
        }

        console.log('Password reset email sent successfully for:', email);
        res.status(200).json({ message: 'Password reset email sent successfully', data });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const resetPassword = async (req, res) => {
    const { token, newPassword } = req.body;
    console.log('Reset password request received:', { token: token ? 'provided' : 'missing' });

    if (!token || !newPassword) {
        console.log('Reset password validation failed: Missing token or new password');
        return res.status(400).json({ error: 'Token and new password are required' });
    }

    try {
        console.log('Verifying OTP token for password recovery');
        const { data: authData, error: authError } = await supabase.auth.verifyOtp({
            token,
            type: 'recovery',
        });

        if (authError) {
            console.error('Token verification error:', authError);
            return res.status(400).json({ error: authError.message || 'Invalid or expired reset token' });
        }

        if (!authData?.user) {
            console.log('No user found for token');
            return res.status(400).json({ error: 'No user associated with this token' });
        }

        console.log('Token verified, updating password for user:', authData.user.id);
        const { data, error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            console.error('Password update error:', error);
            return res.status(400).json({ error: error.message || 'Failed to update password' });
        }

        console.log('Password reset successful for user:', data.user.id);
        res.status(200).json({
            message: 'Password reset successfully',
            data: {
                session: data.session || null,
                user: data.user,
            },
        });
    } catch (err) {
        console.error('Reset password error:', err.message, err.stack);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = { signup, login, forgotPassword, resetPassword };
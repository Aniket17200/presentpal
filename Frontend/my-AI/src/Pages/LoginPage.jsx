import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Login = ({ setUser }) => {
    const [formData, setFormData] = useState({ email: '', password: '' });
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        try {
            const response = await fetch('http://localhost:5100/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();
            if (response.ok) {
                localStorage.setItem('supabaseSession', JSON.stringify(data.data));
                setUser(data.data.user);
                navigate('/upload'); // Redirect to upload page after login
            } else {
                setError(data.error || 'Login failed');
            }
        } catch (error) {
            setError('Something went wrong. Please try again later.');
            console.error('Login error:', error);
        }
    };

    const handleForgotPassword = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        try {
            const response = await fetch('http://localhost:5100/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: formData.email }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage('Password reset email sent. Please check your email.');
                setTimeout(() => setIsForgotPassword(false), 3000);
            } else {
                setError(data.error || 'Failed to send password reset email');
            }
        } catch (error) {
            setError('Something went wrong. Please try again later.');
            console.error('Forgot password error:', error);
        }
    };

    return (
        <div className="mt-12 flex min-h-screen justify-center items-center bg-gray-50">
            <div className="flex flex-col lg:flex-row justify-center items-center w-full lg:h-[80vh] lg:w-3/5 bg-white p-10 rounded-3xl shadow-2xl">
                <div className="hidden lg:flex w-2/4 justify-center items-center rounded-l-3xl h-full">
                    <img src="human.png" alt="Login illustration" className="w-[618px] h-[343px] object-contain" />
                </div>
                <div className="w-full lg:w-2/4 flex flex-col justify-center items-center p-2 h-full">
                    <h2 className="text-4xl font-bold mb-6">{isForgotPassword ? 'Forgot Password' : 'Login'}</h2>
                    {error && <p className="text-red-500">{error}</p>}
                    {message && <p className="text-green-500">{message}</p>}
                    {isForgotPassword ? (
                        <form className="w-full max-w-md" onSubmit={handleForgotPassword}>
                            <div className="flex items-center mb-4">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Your Email"
                                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-200">
                                Send Reset Link
                            </button>
                            <p className="mt-4 text-center text-sm">
                                Remember your password?{' '}
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(false)}
                                    className="text-blue-500 hover:underline"
                                >
                                    Login here
                                </button>
                            </p>
                        </form>
                    ) : (
                        <form className="w-full max-w-md" onSubmit={handleLogin}>
                            <div className="flex items-center mb-4">
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="Your Email"
                                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <div className="flex items-center mb-4">
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Password"
                                    className="w-full py-3 px-4 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                    required
                                />
                            </div>
                            <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-200">
                                Log in
                            </button>
                            <p className="mt-4 text-center text-sm">
                                Forgot your password?{' '}
                                <button
                                    type="button"
                                    onClick={() => setIsForgotPassword(true)}
                                    className="text-blue-500 hover:underline"
                                >
                                    Reset it here
                                </button>
                            </p>
                        </form>
                    )}
                    <div className="mt-6 text-center">
                        <p className="text-sm">
                            Don't have an account?{' '}
                            <a href="/signup" className="text-blue-500">Create an account</a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Signup = ({ setUser }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setError(null);
        setMessage(null);

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        try {
            const response = await fetch('http://localhost:5100/api/auth/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                }),
            });

            const data = await response.json();
            if (response.ok) {
                setMessage('Signup successful. Please check your email to verify your account.');
                setTimeout(() => navigate('/login'), 3000); // Redirect to login after 3 seconds
            } else {
                setError(data.error || 'Signup failed');
            }
        } catch (error) {
            setError('Something went wrong. Please try again later.');
            console.error('Signup error:', error);
        }
    };

    return (
        <div className="mt-16 flex min-h-screen justify-center items-center bg-gray-50">
            <div className="flex flex-col lg:flex-row justify-center items-center w-full lg:h-[80vh] lg:w-3/5 bg-white p-12 rounded-3xl shadow-2xl">
                <div className="w-full lg:w-2/4 flex flex-col justify-center items-start space-y-6">
                    <h2 className="text-4xl font-bold">Sign up</h2>
                    {error && <p className="text-red-500">{error}</p>}
                    {message && <p className="text-green-500">{message}</p>}
                    <form className="w-full max-w-md space-y-4" onSubmit={handleSignup}>
                        <div className="relative">
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Your Name"
                                className="w-full py-3 pl-10 pr-4 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Your Email"
                                className="w-full py-3 pl-10 pr-4 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Password"
                                className="w-full py-3 pl-10 pr-4 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                        <div className="relative">
                            <input
                                type="password"
                                name="confirmPassword"
                                value={formData.confirmPassword}
                                onChange={handleChange}
                                placeholder="Repeat your password"
                                className="w-full py-3 pl-10 pr-4 border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
                                required
                            />
                        </div>
                        <button className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition duration-200">
                            Register
                        </button>
                    </form>
                </div>
                <div className="hidden flex-col lg:flex w-2/4 justify-center items-center">
                    <img src="registe.png" alt="Sign up illustration" className="w-[618px] h-[343px] object-contain" />
                    <p className="text-sm text-center">
                        <a href="/login" className="text-blue-500">I am already a member</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Signup;
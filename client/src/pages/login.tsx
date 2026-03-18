import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/AuthContext';
import { Link, useLocation } from 'wouter';
import authService from '../services/auth';

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [, setLocation] = useLocation();
    const { login } = useAuth();

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');
        try {
            const response = await authService.login({ email, password });
            login(response.user, response.token);
            setLocation('/');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Login failed due to an unknown error.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center px-4">
            <motion.div
                className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center"
                initial={{ opacity: 0, scale: 0.95, y: 40 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
            >
                <motion.h2
                    className="text-3xl font-extrabold text-gray-800 mb-2"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                >
                    Welcome Back 👋
                </motion.h2>
                <motion.p
                    className="text-gray-500 mb-6"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                >
                    Login to your UNiSO account
                </motion.p>

                {error && <motion.p className="text-red-500 text-sm mb-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{error}</motion.p>}

                <motion.form
                    onSubmit={handleLogin}
                    className="space-y-4 text-left"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.3 }}
                >
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <motion.input
                            type="email"
                            className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Enter your email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            whileFocus={{ scale: 1.03, boxShadow: '0 0 0 2px #6C63FF33' }}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <motion.input
                            type="password"
                            className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            whileFocus={{ scale: 1.03, boxShadow: '0 0 0 2px #6C63FF33' }}
                        />
                    </div>
                    <motion.button
                        type="submit"
                        className="w-full py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-full hover:opacity-90 transition"
                        whileHover={{ scale: 1.04 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Login
                    </motion.button>
                </motion.form>

                <motion.p
                    className="text-sm text-gray-500 mt-6"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.7, delay: 0.4 }}
                >
                    Don’t have an account?{' '}
                    <Link href="/signup" className="text-blue-600 font-semibold hover:underline">
                        Sign Up
                    </Link>
                </motion.p>
            </motion.div>
        </div>
    );
};

export default Login;

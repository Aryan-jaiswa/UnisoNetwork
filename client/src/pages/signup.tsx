import React, { useState } from 'react';
import { useAuth } from '../hooks/AuthContext';
import { Link, useLocation } from 'wouter';
import authService from '../services/auth';
import OtpVerification from '../components/auth/OtpVerification';

type SignUpStep = 'form' | 'otp' | 'completed';

const SignUp: React.FC = () => {
    const [step, setStep] = useState<SignUpStep>('form');
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        otpMethod: 'email' as 'email' | 'sms'
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [, setLocation] = useLocation();
    const { login } = useAuth();

    const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (formData.otpMethod === 'sms' && !formData.phone) {
            setError('Phone number is required for SMS verification');
            return;
        }

        if (formData.otpMethod === 'email' && !formData.email) {
            setError('Email is required for email verification');
            return;
        }

        try {
            setIsLoading(true);
            // Send OTP
            await authService.sendOtp({
                email: formData.otpMethod === 'email' ? formData.email : undefined,
                phone: formData.otpMethod === 'sms' ? formData.phone : undefined,
                type: formData.otpMethod
            });
            setStep('otp');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to send OTP. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleOtpVerify = async (otpCode: string) => {
        try {
            setIsLoading(true);
            // Verify OTP and complete registration
            const response = await authService.verifyOtpAndRegister({
                name: formData.name,
                email: formData.email,
                phone: formData.phone || undefined,
                password: formData.password,
                otp_code: otpCode,
                otp_type: formData.otpMethod
            });
            
            // Use login function from AuthContext
            login(response.user, response.token);
            
            // Redirect to home
            setLocation('/');
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('OTP verification failed. Please try again.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendOtp = async () => {
        try {
            setError('');
            await authService.sendOtp({
                email: formData.otpMethod === 'email' ? formData.email : undefined,
                phone: formData.otpMethod === 'sms' ? formData.phone : undefined,
                type: formData.otpMethod
            });
        } catch (err: unknown) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Failed to resend OTP. Please try again.');
            }
        }
    };

    if (step === 'otp') {
        return (
            <OtpVerification
                contactInfo={formData.otpMethod === 'email' ? formData.email : formData.phone}
                contactType={formData.otpMethod}
                onVerify={handleOtpVerify}
                onResend={handleResendOtp}
                isLoading={isLoading}
                error={error}
            />
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center px-4">
            <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
                <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Create Account 🚀</h2>
                <p className="text-gray-500 mb-6">Join the UNiSO community today</p>

                {error && <p className="text-red-500 text-sm mb-4">{error}</p>}

                <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Enter your full name"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            type="email"
                            className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                        <input
                            type="tel"
                            className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Enter your phone number"
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Create a password"
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
                        <input
                            type="password"
                            className="w-full px-4 py-2 rounded-full border border-gray-300 focus:ring-2 focus:ring-blue-400 outline-none"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                            required
                            disabled={isLoading}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Verification Method</label>
                        <div className="flex space-x-4">
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="otpMethod"
                                    value="email"
                                    checked={formData.otpMethod === 'email'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, otpMethod: e.target.value as 'email' | 'sms' }))}
                                    className="mr-2"
                                    disabled={isLoading}
                                />
                                <span className="text-sm">Email</span>
                            </label>
                            <label className="flex items-center">
                                <input
                                    type="radio"
                                    name="otpMethod"
                                    value="sms"
                                    checked={formData.otpMethod === 'sms'}
                                    onChange={(e) => setFormData(prev => ({ ...prev, otpMethod: e.target.value as 'email' | 'sms' }))}
                                    className="mr-2"
                                    disabled={isLoading || !formData.phone}
                                />
                                <span className="text-sm">SMS</span>
                            </label>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-full hover:opacity-90 transition disabled:opacity-50"
                    >
                        {isLoading ? 'Sending OTP...' : 'Sign Up'}
                    </button>
                </form>

                <p className="text-sm text-gray-500 mt-6">
                    Already have an account?{' '}
                    <Link href="/login" className="text-blue-600 font-semibold hover:underline">
                        Login
                    </Link>
                </p>
            </div>
        </div>
    );
};

export default SignUp;

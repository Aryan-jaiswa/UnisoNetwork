import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';

interface OtpVerificationProps {
  contactInfo: string; // email or phone
  contactType: 'email' | 'sms';
  onVerify: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const OtpVerification: React.FC<OtpVerificationProps> = ({
  contactInfo,
  contactType,
  onVerify,
  onResend,
  isLoading = false,
  error
}) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [timeLeft]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single character
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpCode = otp.join('');
    if (otpCode.length === 6) {
      await onVerify(otpCode);
    }
  };

  const handleResend = async () => {
    await onResend();
    setTimeLeft(300);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const maskedContact = contactType === 'email' 
    ? contactInfo.replace(/(.{2})(.*)(@.*)/, '$1***$3')
    : contactInfo.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-400 to-blue-500 flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center">
        <div className="mb-6">
          <h2 className="text-3xl font-extrabold text-gray-800 mb-2">Verify Your {contactType === 'email' ? 'Email' : 'Phone'} 📱</h2>
          <p className="text-gray-500">
            We've sent a 6-digit code to <br />
            <span className="font-semibold text-gray-700">{maskedContact}</span>
          </p>
        </div>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-600">
              {error}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex justify-center space-x-2">
            {otp.map((digit, index) => (
              <Input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-12 text-center text-lg font-semibold border-2 rounded-lg focus:border-blue-500 focus:ring-blue-500"
                disabled={isLoading}
              />
            ))}
          </div>

          <Button
            type="submit"
            disabled={otp.join('').length !== 6 || isLoading}
            className="w-full py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold rounded-full hover:opacity-90 transition disabled:opacity-50"
          >
            {isLoading ? 'Verifying...' : 'Verify OTP'}
          </Button>
        </form>

        <div className="mt-6 space-y-3">
          <p className="text-sm text-gray-500">
            {timeLeft > 0 ? (
              <>Code expires in {formatTime(timeLeft)}</>
            ) : (
              <span className="text-red-500">Code has expired</span>
            )}
          </p>
          
          <Button
            variant="ghost"
            onClick={handleResend}
            disabled={!canResend || isLoading}
            className="text-blue-600 hover:text-blue-700 underline disabled:opacity-50"
          >
            {canResend ? 'Resend Code' : `Resend in ${formatTime(timeLeft)}`}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OtpVerification;

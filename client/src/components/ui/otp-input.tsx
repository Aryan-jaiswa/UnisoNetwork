import React, { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent, ChangeEvent } from 'react';
import { cn } from '@/lib/utils';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  className?: string;
  onComplete?: (value: string) => void;
  autoFocus?: boolean;
}

/**
 * OTP Input Component with auto-focus, paste support, and loading states
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChange,
  disabled = false,
  loading = false,
  placeholder = '•',
  className,
  onComplete,
  autoFocus = true
}) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Initialize input values array
  const values = Array.from({ length }, (_, i) => value[i] || '');

  useEffect(() => {
    if (autoFocus && !disabled && !loading) {
      inputRefs.current[0]?.focus();
    }
  }, [autoFocus, disabled, loading]);

  useEffect(() => {
    if (value.length === length && onComplete) {
      onComplete(value);
    }
  }, [value, length, onComplete]);

  const handleInputChange = (index: number, inputValue: string) => {
    // Only allow digits
    const digit = inputValue.replace(/\D/g, '').slice(-1);
    
    const newValues = [...values];
    newValues[index] = digit;
    
    const newValue = newValues.join('');
    onChange(newValue);

    // Auto-focus next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!values[index] && index > 0) {
        // If current input is empty, move to previous and clear it
        const newValues = [...values];
        newValues[index - 1] = '';
        onChange(newValues.join(''));
        inputRefs.current[index - 1]?.focus();
        setFocusedIndex(index - 1);
      } else {
        // Clear current input
        const newValues = [...values];
        newValues[index] = '';
        onChange(newValues.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setFocusedIndex(index - 1);
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
      setFocusedIndex(index + 1);
    } else if (e.key === 'Delete') {
      const newValues = [...values];
      newValues[index] = '';
      onChange(newValues.join(''));
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').replace(/\D/g, '');
    
    if (pastedData) {
      const pastedValues = pastedData.slice(0, length).split('');
      const newValues = Array.from({ length }, (_, i) => pastedValues[i] || '');
      onChange(newValues.join(''));
      
      // Focus the next empty input or the last input
      const nextIndex = Math.min(pastedValues.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      setFocusedIndex(nextIndex);
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
    // Select all text on focus for easier editing
    inputRefs.current[index]?.select();
  };

  const handleClick = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  return (
    <div className={cn("flex gap-2 items-center justify-center", className)}>
      {Array.from({ length }, (_, index) => (
        <div key={index} className="relative">
          <input
            ref={(el) => (inputRefs.current[index] = el)}
            type="text"
            inputMode="numeric"
            pattern="\d*"
            maxLength={1}
            value={values[index]}
            onChange={(e: ChangeEvent<HTMLInputElement>) => handleInputChange(index, e.target.value)}
            onKeyDown={(e) => handleKeyDown(index, e)}
            onPaste={handlePaste}
            onFocus={() => handleFocus(index)}
            onClick={() => handleClick(index)}
            disabled={disabled || loading}
            placeholder={placeholder}
            className={cn(
              "w-12 h-12 text-center text-lg font-semibold border rounded-lg",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
              "transition-colors duration-200",
              {
                "border-gray-300 bg-white text-gray-900": !disabled && !loading,
                "border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed": disabled || loading,
                "border-blue-500 bg-blue-50": focusedIndex === index && !disabled && !loading,
                "border-green-500 bg-green-50": values[index] && !disabled && !loading,
                "border-red-500 bg-red-50": false, // Add error state if needed
                "animate-pulse": loading
              }
            )}
            autoComplete="one-time-code"
            aria-label={`Digit ${index + 1} of ${length}`}
          />
          
          {/* Loading indicator */}
          {loading && index === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

interface OtpInputWithTimerProps extends OtpInputProps {
  onResend?: () => void;
  resendCooldown?: number; // in seconds
  resendDisabled?: boolean;
  resendText?: string;
  resendingText?: string;
  showTimer?: boolean;
}

/**
 * OTP Input with Resend Timer Component
 */
export const OtpInputWithTimer: React.FC<OtpInputWithTimerProps> = ({
  onResend,
  resendCooldown = 60,
  resendDisabled = false,
  resendText = "Didn't receive the code?",
  resendingText = "Sending...",
  showTimer = true,
  ...otpProps
}) => {
  const [timeLeft, setTimeLeft] = useState(resendCooldown);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [timeLeft]);

  const handleResend = async () => {
    if (onResend && timeLeft === 0 && !isResending) {
      setIsResending(true);
      try {
        await onResend();
        setTimeLeft(resendCooldown);
      } catch (error) {
        console.error('Resend failed:', error);
      } finally {
        setIsResending(false);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <OtpInput {...otpProps} />
      
      <div className="text-center">
        <div className="text-sm text-gray-600 mb-2">
          {resendText}
        </div>
        
        {timeLeft > 0 ? (
          <div className="text-sm text-gray-500">
            {showTimer && (
              <>
                Resend available in{' '}
                <span className="font-mono font-semibold text-blue-600">
                  {formatTime(timeLeft)}
                </span>
              </>
            )}
          </div>
        ) : (
          <button
            onClick={handleResend}
            disabled={resendDisabled || isResending}
            className={cn(
              "text-sm font-medium underline transition-colors duration-200",
              {
                "text-blue-600 hover:text-blue-800 cursor-pointer": !resendDisabled && !isResending,
                "text-gray-400 cursor-not-allowed": resendDisabled || isResending
              }
            )}
          >
            {isResending ? resendingText : 'Resend Code'}
          </button>
        )}
      </div>
    </div>
  );
};

export default OtpInput;

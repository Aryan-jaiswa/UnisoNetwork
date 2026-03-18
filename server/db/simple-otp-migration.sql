-- Simple OTP migration without problematic indexes

-- Drop old OTP table if it exists
DROP TABLE IF EXISTS otp_storage CASCADE;

-- Create new secure OTP storage table
CREATE TABLE otp_storage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contact_info TEXT NOT NULL,
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')),
    purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'login', 'reset')),
    otp_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL,
    max_attempts INTEGER DEFAULT 5 NOT NULL,
    locked_until TIMESTAMP,
    last_sent_at TIMESTAMP DEFAULT NOW() NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    channel TEXT CHECK (channel IN ('email', 'sms', 'web', 'api')),
    purpose TEXT CHECK (purpose IN ('signup', 'login', 'reset')),
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'blocked')),
    ip_address TEXT,
    user_agent TEXT,
    details TEXT,
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create rate limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE,
    requests INTEGER DEFAULT 1 NOT NULL,
    window_start TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- Create basic indexes
CREATE INDEX idx_otp_storage_contact_channel_purpose ON otp_storage(contact_info, channel, purpose);
CREATE INDEX idx_otp_storage_expires_at ON otp_storage(expires_at);
CREATE INDEX idx_otp_storage_user_id ON otp_storage(user_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_rate_limits_key ON rate_limits(key);
CREATE INDEX idx_rate_limits_expires_at ON rate_limits(expires_at);

-- Add phone and verification columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- Update existing users to be verified
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL OR is_verified = FALSE;

-- Migration script to add OTP support to the database

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL,
ADD COLUMN IF NOT EXISTS otp_code TEXT,
ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS otp_type TEXT;

-- Create OTP storage table for temporary OTP codes
CREATE TABLE IF NOT EXISTS otp_storage (
    id SERIAL PRIMARY KEY,
    contact_info TEXT NOT NULL UNIQUE, -- email or phone
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    otp_type TEXT NOT NULL, -- 'email' or 'sms'
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Create index for faster OTP lookups
CREATE INDEX IF NOT EXISTS idx_otp_storage_contact_type ON otp_storage(contact_info, otp_type);
CREATE INDEX IF NOT EXISTS idx_otp_storage_expires ON otp_storage(expires_at);

-- Set existing users as verified (assuming they were verified manually before OTP system)
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL;

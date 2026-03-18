-- Migration script for hardened OTP system
-- Run this script to upgrade your database to support secure OTP functionality

-- ============================================
-- BACKUP EXISTING DATA (IMPORTANT!)
-- ============================================
-- Before running this migration, backup existing OTP data if needed:
-- CREATE TABLE otp_storage_backup AS SELECT * FROM otp_storage;

-- ============================================
-- DROP OLD TABLES (if migrating from old schema)
-- ============================================
-- Uncomment these lines if you need to completely replace the old schema:
-- DROP TABLE IF EXISTS otp_storage;
-- DROP TABLE IF EXISTS audit_logs;
-- DROP TABLE IF EXISTS rate_limits;

-- ============================================
-- CREATE NEW SECURE OTP STORAGE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS otp_storage (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, -- For tracking per-user limits
    contact_info TEXT NOT NULL, -- email or phone (not unique for multiple purposes)
    channel TEXT NOT NULL CHECK (channel IN ('email', 'sms')), -- 'email' or 'sms'
    purpose TEXT NOT NULL CHECK (purpose IN ('signup', 'login', 'reset')), -- 'signup', 'login', 'reset'
    otp_hash TEXT NOT NULL, -- SHA-256 hash of OTP
    salt TEXT NOT NULL, -- Random salt for hashing
    expires_at TIMESTAMP NOT NULL,
    attempts INTEGER DEFAULT 0 NOT NULL, -- Failed verification attempts
    max_attempts INTEGER DEFAULT 5 NOT NULL, -- Max attempts before lock
    locked_until TIMESTAMP, -- Hard lock timestamp
    last_sent_at TIMESTAMP DEFAULT NOW() NOT NULL, -- For resend cooldown
    ip_address TEXT, -- Request IP for security
    user_agent TEXT, -- User agent for tracking
    created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- CREATE AUDIT LOG TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    action TEXT NOT NULL, -- 'otp_send', 'otp_verify', 'otp_fail', etc.
    channel TEXT CHECK (channel IN ('email', 'sms', 'web', 'api')), -- 'email', 'sms', 'web', 'api'
    purpose TEXT CHECK (purpose IN ('signup', 'login', 'reset')), -- 'signup', 'login', 'reset'
    status TEXT NOT NULL CHECK (status IN ('success', 'failure', 'blocked')), -- 'success', 'failure', 'blocked'
    ip_address TEXT,
    user_agent TEXT,
    details TEXT, -- JSON string with additional context
    timestamp TIMESTAMP DEFAULT NOW() NOT NULL
);

-- ============================================
-- CREATE RATE LIMITING TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS rate_limits (
    id SERIAL PRIMARY KEY,
    key TEXT NOT NULL UNIQUE, -- IP + route or user + action
    requests INTEGER DEFAULT 1 NOT NULL,
    window_start TIMESTAMP DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP NOT NULL
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- OTP storage indexes
CREATE INDEX IF NOT EXISTS idx_otp_storage_contact_channel_purpose 
ON otp_storage(contact_info, channel, purpose);

CREATE INDEX IF NOT EXISTS idx_otp_storage_expires_at 
ON otp_storage(expires_at);

CREATE INDEX IF NOT EXISTS idx_otp_storage_user_id 
ON otp_storage(user_id);

CREATE INDEX IF NOT EXISTS idx_otp_storage_locked_until 
ON otp_storage(locked_until) WHERE locked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_otp_storage_last_sent_at 
ON otp_storage(last_sent_at);

CREATE INDEX IF NOT EXISTS idx_otp_storage_daily_count 
ON otp_storage(contact_info, channel, created_at);

-- Audit log indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id 
ON audit_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
ON audit_logs(timestamp);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action 
ON audit_logs(action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_status 
ON audit_logs(status);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_address 
ON audit_logs(ip_address);

-- Rate limit indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_key 
ON rate_limits(key);

CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at 
ON rate_limits(expires_at);

-- ============================================
-- TTL INDEXES (for automatic cleanup)
-- ============================================

-- Create TTL index for automatic cleanup of expired OTP records
-- Note: PostgreSQL doesn't have TTL like MongoDB, but we can use this for manual cleanup
CREATE INDEX IF NOT EXISTS idx_otp_storage_ttl 
ON otp_storage(expires_at) WHERE expires_at < NOW();

-- Create TTL index for automatic cleanup of expired rate limits
CREATE INDEX IF NOT EXISTS idx_rate_limits_ttl 
ON rate_limits(expires_at) WHERE expires_at < NOW();

-- Create index for old audit logs cleanup (90 days)
CREATE INDEX IF NOT EXISTS idx_audit_logs_ttl 
ON audit_logs(timestamp) WHERE timestamp < (NOW() - INTERVAL '90 days');

-- ============================================
-- UPDATE EXISTING USERS TABLE (if needed)
-- ============================================

-- Add new columns to users table if they don't exist
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT FALSE NOT NULL;

-- Update existing users to be verified (assuming they were verified manually before OTP system)
UPDATE users SET is_verified = TRUE WHERE is_verified IS NULL OR is_verified = FALSE;

-- ============================================
-- CREATE CLEANUP FUNCTION
-- ============================================

-- Function to clean up expired records
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS INTEGER AS $$
DECLARE
    otp_deleted INTEGER;
    rate_limit_deleted INTEGER;
    audit_deleted INTEGER;
    total_deleted INTEGER;
BEGIN
    -- Cleanup expired OTP records
    DELETE FROM otp_storage WHERE expires_at < NOW();
    GET DIAGNOSTICS otp_deleted = ROW_COUNT;
    
    -- Cleanup expired rate limits
    DELETE FROM rate_limits WHERE expires_at < NOW();
    GET DIAGNOSTICS rate_limit_deleted = ROW_COUNT;
    
    -- Cleanup old audit logs (keep 90 days)
    DELETE FROM audit_logs WHERE timestamp < (NOW() - INTERVAL '90 days');
    GET DIAGNOSTICS audit_deleted = ROW_COUNT;
    
    total_deleted := otp_deleted + rate_limit_deleted + audit_deleted;
    
    -- Log cleanup results
    RAISE NOTICE 'Cleanup completed: % OTP records, % rate limits, % audit logs deleted', 
        otp_deleted, rate_limit_deleted, audit_deleted;
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE SCHEDULED CLEANUP (Optional)
-- ============================================

-- Note: This requires pg_cron extension
-- Uncomment if you have pg_cron installed and want automatic cleanup

-- SELECT cron.schedule('cleanup-expired-records', '0 2 * * *', 'SELECT cleanup_expired_records();');

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to your application user
-- Replace 'your_app_user' with your actual database user
-- GRANT SELECT, INSERT, UPDATE, DELETE ON otp_storage TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON audit_logs TO your_app_user;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON rate_limits TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE otp_storage_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE rate_limits_id_seq TO your_app_user;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these queries to verify the migration was successful:

-- Check table structures
SELECT table_name, column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name IN ('otp_storage', 'audit_logs', 'rate_limits')
ORDER BY table_name, ordinal_position;

-- Check indexes
SELECT tablename, indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('otp_storage', 'audit_logs', 'rate_limits')
ORDER BY tablename, indexname;

-- Check constraints
SELECT table_name, constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name IN ('otp_storage', 'audit_logs', 'rate_limits')
ORDER BY table_name, constraint_name;

-- Test the cleanup function
-- SELECT cleanup_expired_records();

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Insert a record to mark migration completion
INSERT INTO audit_logs (action, status, details, timestamp) 
VALUES ('migration_secure_otp', 'success', '{"version": "1.0", "description": "Hardened OTP system migration completed"}', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Secure OTP migration completed successfully!';
    RAISE NOTICE 'Please update your application code to use the new secure OTP endpoints.';
    RAISE NOTICE 'Consider setting up automated cleanup with pg_cron or application-level scheduling.';
END $$;

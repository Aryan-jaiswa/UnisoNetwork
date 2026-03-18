-- Migration script for password reset functionality
-- Run this script to add password reset support to your existing database

-- ============================================
-- ADD PASSWORD RESET COLUMNS TO USERS TABLE
-- ============================================

-- Add password reset token fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS reset_password_token TEXT,
ADD COLUMN IF NOT EXISTS reset_password_expires TIMESTAMP,
ADD COLUMN IF NOT EXISTS last_password_reset TIMESTAMP;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for password reset token lookup
CREATE INDEX IF NOT EXISTS idx_users_reset_token 
ON users(reset_password_token) WHERE reset_password_token IS NOT NULL;

-- Index for expired token cleanup
CREATE INDEX IF NOT EXISTS idx_users_reset_expires 
ON users(reset_password_expires) WHERE reset_password_expires IS NOT NULL;

-- Index for password reset history
CREATE INDEX IF NOT EXISTS idx_users_last_reset 
ON users(last_password_reset);

-- ============================================
-- UPDATE AUDIT LOG ACTIONS (if needed)
-- ============================================

-- No schema changes needed for audit_logs table as it already supports
-- password reset actions through the flexible action field

-- ============================================
-- CLEANUP FUNCTION FOR EXPIRED TOKENS
-- ============================================

-- Update the existing cleanup function to include password reset tokens
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS INTEGER AS $$
DECLARE
    otp_deleted INTEGER;
    rate_limit_deleted INTEGER;
    audit_deleted INTEGER;
    reset_tokens_cleared INTEGER;
    total_deleted INTEGER;
BEGIN
    -- Cleanup expired OTP records
    DELETE FROM otp_storage WHERE expires_at < NOW();
    GET DIAGNOSTICS otp_deleted = ROW_COUNT;
    
    -- Cleanup expired rate limits
    DELETE FROM rate_limits WHERE expires_at < NOW();
    GET DIAGNOSTICS rate_limit_deleted = ROW_COUNT;
    
    -- Cleanup expired password reset tokens
    UPDATE users 
    SET reset_password_token = NULL, reset_password_expires = NULL 
    WHERE reset_password_expires < NOW() 
    AND reset_password_token IS NOT NULL;
    GET DIAGNOSTICS reset_tokens_cleared = ROW_COUNT;
    
    -- Cleanup old audit logs (keep 90 days)
    DELETE FROM audit_logs WHERE timestamp < (NOW() - INTERVAL '90 days');
    GET DIAGNOSTICS audit_deleted = ROW_COUNT;
    
    total_deleted := otp_deleted + rate_limit_deleted + audit_deleted + reset_tokens_cleared;
    
    -- Log cleanup results
    RAISE NOTICE 'Cleanup completed: % OTP records, % rate limits, % reset tokens, % audit logs processed', 
        otp_deleted, rate_limit_deleted, reset_tokens_cleared, audit_deleted;
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- SECURITY FUNCTION FOR TOKEN VALIDATION
-- ============================================

-- Function to validate reset token format (optional - can be done in application)
CREATE OR REPLACE FUNCTION is_valid_reset_token(token TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if token is 64 characters (32 bytes hex)
    -- Check if token contains only hex characters
    RETURN LENGTH(token) = 64 AND token ~ '^[a-f0-9]+$';
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to your application user
-- Replace 'your_app_user' with your actual database user
-- GRANT SELECT, UPDATE ON users TO your_app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_records() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION is_valid_reset_token(TEXT) TO your_app_user;

-- ============================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================

-- Test the reset token functionality
-- Note: These are examples - DO NOT run in production

-- Example: Set a reset token for testing
-- UPDATE users 
-- SET reset_password_token = 'test_hash_here', 
--     reset_password_expires = NOW() + INTERVAL '15 minutes'
-- WHERE email = 'test@example.com';

-- Example: Find user by reset token
-- SELECT id, email, name, reset_password_expires 
-- FROM users 
-- WHERE reset_password_token = 'test_hash_here' 
-- AND reset_password_expires > NOW();

-- Example: Clear expired tokens
-- SELECT cleanup_expired_records();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the migration was successful
SELECT 
    column_name, 
    data_type, 
    is_nullable 
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('reset_password_token', 'reset_password_expires', 'last_password_reset')
ORDER BY column_name;

-- Check indexes were created
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname LIKE '%reset%'
ORDER BY indexname;

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Count active reset tokens
SELECT COUNT(*) as active_reset_tokens
FROM users 
WHERE reset_password_token IS NOT NULL 
AND reset_password_expires > NOW();

-- Count expired reset tokens (should be cleaned up)
SELECT COUNT(*) as expired_reset_tokens
FROM users 
WHERE reset_password_token IS NOT NULL 
AND reset_password_expires <= NOW();

-- Recent password reset activity
SELECT 
    COUNT(*) as reset_requests_today,
    COUNT(CASE WHEN action = 'password_reset_complete' THEN 1 END) as successful_resets_today
FROM audit_logs 
WHERE action IN ('password_reset_request', 'password_reset_complete')
AND timestamp > CURRENT_DATE;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Insert a record to mark migration completion
INSERT INTO audit_logs (action, status, details, timestamp) 
VALUES ('migration_password_reset', 'success', '{"version": "1.0", "description": "Password reset functionality migration completed"}', NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Password reset migration completed successfully!';
    RAISE NOTICE 'New columns added: reset_password_token, reset_password_expires, last_password_reset';
    RAISE NOTICE 'Indexes created for performance optimization';
    RAISE NOTICE 'Cleanup function updated to handle expired reset tokens';
    RAISE NOTICE 'Please update your application to use the new password reset endpoints';
END $$;

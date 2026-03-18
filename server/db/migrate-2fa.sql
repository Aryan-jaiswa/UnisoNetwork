-- Migration script for Two-Factor Authentication (2FA)
-- This adds 2FA support to the existing hardened OTP system

-- ============================================
-- ADD 2FA COLUMNS TO USERS TABLE
-- ============================================

-- Add 2FA fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS two_factor_channel TEXT,
ADD COLUMN IF NOT EXISTS two_factor_backup_enabled BOOLEAN DEFAULT false NOT NULL,
ADD COLUMN IF NOT EXISTS last_2fa_at TIMESTAMP;

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Index for 2FA enabled users lookup
CREATE INDEX IF NOT EXISTS idx_users_2fa_enabled 
ON users(two_factor_enabled) WHERE two_factor_enabled = true;

-- Index for 2FA channel lookup
CREATE INDEX IF NOT EXISTS idx_users_2fa_channel 
ON users(two_factor_channel) WHERE two_factor_channel IS NOT NULL;

-- Index for last 2FA activity
CREATE INDEX IF NOT EXISTS idx_users_last_2fa 
ON users(last_2fa_at);

-- ============================================
-- VALIDATE EXISTING OTP_STORAGE TABLE
-- ============================================

-- Ensure otp_storage table supports 'login' purpose
-- (This should already exist from the hardened OTP implementation)

-- Check if we need to add any constraints
DO $$
BEGIN
    -- Add check constraint for valid purposes including 'login'
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'otp_storage' 
        AND constraint_name = 'otp_storage_purpose_check'
    ) THEN
        ALTER TABLE otp_storage 
        ADD CONSTRAINT otp_storage_purpose_check 
        CHECK (purpose IN ('signup', 'login', 'reset'));
    END IF;
    
    -- Add check constraint for valid channels
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'otp_storage' 
        AND constraint_name = 'otp_storage_channel_check'
    ) THEN
        ALTER TABLE otp_storage 
        ADD CONSTRAINT otp_storage_channel_check 
        CHECK (channel IN ('email', 'sms'));
    END IF;
    
    -- Add check constraint for valid 2FA channels in users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND constraint_name = 'users_2fa_channel_check'
    ) THEN
        ALTER TABLE users 
        ADD CONSTRAINT users_2fa_channel_check 
        CHECK (two_factor_channel IN ('email', 'sms') OR two_factor_channel IS NULL);
    END IF;
END $$;

-- ============================================
-- UPDATE AUDIT LOG ACTIONS (if needed)
-- ============================================

-- The audit_logs table already supports flexible action types,
-- so no schema changes needed for new 2FA audit actions

-- ============================================
-- SECURITY FUNCTION FOR 2FA VALIDATION
-- ============================================

-- Function to validate 2FA configuration
CREATE OR REPLACE FUNCTION validate_2fa_config(
    user_id INTEGER,
    channel TEXT,
    phone_number TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
    user_phone TEXT;
BEGIN
    -- Get user's contact information
    SELECT email, phone INTO user_email, user_phone
    FROM users WHERE id = user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Validate email channel
    IF channel = 'email' THEN
        RETURN user_email IS NOT NULL AND user_email != '';
    END IF;
    
    -- Validate SMS channel
    IF channel = 'sms' THEN
        -- Use provided phone or user's existing phone
        RETURN (phone_number IS NOT NULL AND phone_number != '') OR 
               (user_phone IS NOT NULL AND user_phone != '');
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCTION TO GET USER 2FA STATISTICS
-- ============================================

CREATE OR REPLACE FUNCTION get_2fa_stats()
RETURNS TABLE(
    total_users BIGINT,
    users_with_2fa BIGINT,
    email_2fa_users BIGINT,
    sms_2fa_users BIGINT,
    adoption_percentage NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE two_factor_enabled = true) as users_with_2fa,
        COUNT(*) FILTER (WHERE two_factor_enabled = true AND two_factor_channel = 'email') as email_2fa_users,
        COUNT(*) FILTER (WHERE two_factor_enabled = true AND two_factor_channel = 'sms') as sms_2fa_users,
        ROUND(
            (COUNT(*) FILTER (WHERE two_factor_enabled = true))::NUMERIC / 
            NULLIF(COUNT(*), 0) * 100, 2
        ) as adoption_percentage
    FROM users;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- UPDATE CLEANUP FUNCTION
-- ============================================

-- Update existing cleanup function to handle 2FA-related cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS INTEGER AS $$
DECLARE
    otp_deleted INTEGER;
    rate_limit_deleted INTEGER;
    audit_deleted INTEGER;
    reset_tokens_cleared INTEGER;
    total_deleted INTEGER;
BEGIN
    -- Cleanup expired OTP records (including login 2FA OTPs)
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
    RAISE NOTICE '2FA-enabled cleanup completed: % OTP records, % rate limits, % reset tokens, % audit logs processed', 
        otp_deleted, rate_limit_deleted, reset_tokens_cleared, audit_deleted;
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant necessary permissions to your application user
-- Replace 'your_app_user' with your actual database user
-- GRANT SELECT, UPDATE ON users TO your_app_user;
-- GRANT EXECUTE ON FUNCTION validate_2fa_config(INTEGER, TEXT, TEXT) TO your_app_user;
-- GRANT EXECUTE ON FUNCTION get_2fa_stats() TO your_app_user;
-- GRANT EXECUTE ON FUNCTION cleanup_expired_records() TO your_app_user;

-- ============================================
-- SAMPLE QUERIES FOR TESTING
-- ============================================

-- Test the 2FA functionality
-- Note: These are examples - DO NOT run in production

-- Example: Enable 2FA for a user
-- UPDATE users 
-- SET two_factor_enabled = true, 
--     two_factor_channel = 'email'
-- WHERE email = 'test@example.com';

-- Example: Check 2FA configuration validity
-- SELECT validate_2fa_config(1, 'email', NULL);
-- SELECT validate_2fa_config(1, 'sms', '+1234567890');

-- Example: Get 2FA adoption statistics
-- SELECT * FROM get_2fa_stats();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Verify the migration was successful
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'users' 
AND column_name IN ('two_factor_enabled', 'two_factor_channel', 'two_factor_backup_enabled', 'last_2fa_at')
ORDER BY column_name;

-- Check indexes were created
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'users' 
AND indexname LIKE '%2fa%'
ORDER BY indexname;

-- Check constraints were added
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_name IN ('users', 'otp_storage')
AND constraint_name LIKE '%2fa%' OR constraint_name LIKE '%purpose%' OR constraint_name LIKE '%channel%'
ORDER BY table_name, constraint_name;

-- ============================================
-- MONITORING QUERIES
-- ============================================

-- Count active 2FA users
SELECT 
    two_factor_channel,
    COUNT(*) as user_count
FROM users 
WHERE two_factor_enabled = true 
GROUP BY two_factor_channel;

-- Recent 2FA login activity
SELECT 
    COUNT(*) as login_2fa_attempts_today,
    COUNT(CASE WHEN status = 'success' THEN 1 END) as successful_2fa_logins_today,
    COUNT(CASE WHEN status = 'failure' THEN 1 END) as failed_2fa_attempts_today
FROM audit_logs 
WHERE purpose = 'login'
AND action IN ('otp_send', 'otp_verify', 'otp_verify_fail')
AND timestamp > CURRENT_DATE;

-- 2FA adoption over time (if you want to track growth)
-- This would require a separate tracking table in a real implementation
SELECT 
    DATE(created_at) as date,
    COUNT(*) FILTER (WHERE two_factor_enabled = true) as new_2fa_users
FROM users 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date;

-- Active 2FA sessions (users who completed 2FA recently)
SELECT 
    COUNT(DISTINCT user_id) as active_2fa_sessions
FROM audit_logs 
WHERE action = 'otp_verify'
AND purpose = 'login'
AND status = 'success'
AND timestamp > NOW() - INTERVAL '24 hours';

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Insert a record to mark migration completion
INSERT INTO audit_logs (action, status, details, timestamp) 
VALUES (
    'migration_2fa', 
    'success', 
    '{"version": "1.0", "description": "Two-Factor Authentication migration completed", "features": ["login_2fa", "2fa_management", "hardened_otp_integration"]}', 
    NOW()
)
ON CONFLICT DO NOTHING;

COMMIT;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '2FA migration completed successfully!';
    RAISE NOTICE 'New columns added: two_factor_enabled, two_factor_channel, two_factor_backup_enabled, last_2fa_at';
    RAISE NOTICE 'Indexes created for performance optimization';
    RAISE NOTICE 'Constraints added for data validation';
    RAISE NOTICE 'Helper functions created for 2FA validation and statistics';
    RAISE NOTICE 'Integration with existing hardened OTP system complete';
    RAISE NOTICE 'Please test the new 2FA endpoints and update your frontend';
END $$;

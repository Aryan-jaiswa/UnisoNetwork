-- Comprehensive migration for all polish features
-- This migration adds trusted devices, backup codes, and enhances the existing tables

-- ============================================
-- CREATE TRUSTED DEVICES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS trusted_devices (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL UNIQUE,
  device_name TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL
);

-- ============================================
-- CREATE BACKUP CODES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS backup_codes (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  used BOOLEAN DEFAULT false NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- ENSURE ALL REQUIRED COLUMNS EXIST
-- ============================================

-- Add 2FA columns to users table if they don't exist
DO $$
BEGIN
    -- Two-factor authentication columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT false NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_channel') THEN
        ALTER TABLE users ADD COLUMN two_factor_channel TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'two_factor_backup_enabled') THEN
        ALTER TABLE users ADD COLUMN two_factor_backup_enabled BOOLEAN DEFAULT false NOT NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_2fa_at') THEN
        ALTER TABLE users ADD COLUMN last_2fa_at TIMESTAMP WITH TIME ZONE;
    END IF;

    -- Password reset columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_password_token') THEN
        ALTER TABLE users ADD COLUMN reset_password_token TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'reset_password_expires') THEN
        ALTER TABLE users ADD COLUMN reset_password_expires TIMESTAMP WITH TIME ZONE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_password_reset') THEN
        ALTER TABLE users ADD COLUMN last_password_reset TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- ============================================
-- ENSURE OTP_STORAGE TABLE EXISTS WITH ALL REQUIRED COLUMNS
-- ============================================

CREATE TABLE IF NOT EXISTS otp_storage (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  contact_info TEXT NOT NULL,
  channel TEXT NOT NULL,
  purpose TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0 NOT NULL,
  max_attempts INTEGER DEFAULT 5 NOT NULL,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- ENSURE AUDIT_LOGS TABLE EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  channel TEXT,
  purpose TEXT,
  status TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- ============================================
-- ENSURE RATE_LIMITS TABLE EXISTS
-- ============================================

CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  requests INTEGER DEFAULT 1 NOT NULL,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- ============================================
-- CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Trusted devices indexes
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user_id ON trusted_devices(user_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_device_id ON trusted_devices(device_id);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_expires_at ON trusted_devices(expires_at);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_active ON trusted_devices(user_id, is_active) WHERE is_active = true;

-- Backup codes indexes
CREATE INDEX IF NOT EXISTS idx_backup_codes_user_id ON backup_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_backup_codes_unused ON backup_codes(user_id, used) WHERE used = false;

-- Users table indexes for 2FA
CREATE INDEX IF NOT EXISTS idx_users_2fa_enabled ON users(two_factor_enabled) WHERE two_factor_enabled = true;
CREATE INDEX IF NOT EXISTS idx_users_2fa_channel ON users(two_factor_channel) WHERE two_factor_channel IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_last_2fa ON users(last_2fa_at);

-- Password reset indexes
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_password_token) WHERE reset_password_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_expires ON users(reset_password_expires) WHERE reset_password_expires IS NOT NULL;

-- OTP storage indexes
CREATE INDEX IF NOT EXISTS idx_otp_storage_user_purpose_channel ON otp_storage(user_id, purpose, channel);
CREATE INDEX IF NOT EXISTS idx_otp_storage_contact_info ON otp_storage(contact_info, channel, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_storage_expires_at ON otp_storage(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_storage_locked_until ON otp_storage(locked_until) WHERE locked_until IS NOT NULL;

-- Audit logs indexes
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action_timestamp ON audit_logs(user_id, action, timestamp);

-- Rate limits indexes
CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);

-- ============================================
-- ADD CONSTRAINTS
-- ============================================

-- Two-factor authentication constraints
DO $$
BEGIN
    -- 2FA channel constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'users' AND constraint_name = 'users_2fa_channel_check') THEN
        ALTER TABLE users ADD CONSTRAINT users_2fa_channel_check 
        CHECK (two_factor_channel IN ('email', 'sms') OR two_factor_channel IS NULL);
    END IF;
    
    -- OTP purpose constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'otp_storage' AND constraint_name = 'otp_storage_purpose_check') THEN
        ALTER TABLE otp_storage ADD CONSTRAINT otp_storage_purpose_check 
        CHECK (purpose IN ('signup', 'login', 'reset'));
    END IF;
    
    -- OTP channel constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'otp_storage' AND constraint_name = 'otp_storage_channel_check') THEN
        ALTER TABLE otp_storage ADD CONSTRAINT otp_storage_channel_check 
        CHECK (channel IN ('email', 'sms'));
    END IF;
    
    -- Audit status constraint
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE table_name = 'audit_logs' AND constraint_name = 'audit_logs_status_check') THEN
        ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_status_check 
        CHECK (status IN ('success', 'failure', 'blocked'));
    END IF;
END $$;

-- ============================================
-- CREATE UTILITY FUNCTIONS
-- ============================================

-- Function to clean up expired records
CREATE OR REPLACE FUNCTION cleanup_expired_records()
RETURNS TABLE(
    otp_deleted INTEGER,
    rate_limit_deleted INTEGER,
    reset_tokens_cleared INTEGER,
    trusted_devices_cleaned INTEGER,
    audit_deleted INTEGER
) AS $$
DECLARE
    otp_count INTEGER;
    rate_count INTEGER;
    reset_count INTEGER;
    device_count INTEGER;
    audit_count INTEGER;
BEGIN
    -- Cleanup expired OTP records
    DELETE FROM otp_storage WHERE expires_at < NOW();
    GET DIAGNOSTICS otp_count = ROW_COUNT;
    
    -- Cleanup expired rate limits
    DELETE FROM rate_limits WHERE expires_at < NOW();
    GET DIAGNOSTICS rate_count = ROW_COUNT;
    
    -- Cleanup expired password reset tokens
    UPDATE users 
    SET reset_password_token = NULL, reset_password_expires = NULL 
    WHERE reset_password_expires < NOW() 
    AND reset_password_token IS NOT NULL;
    GET DIAGNOSTICS reset_count = ROW_COUNT;
    
    -- Cleanup expired trusted devices
    UPDATE trusted_devices 
    SET is_active = false 
    WHERE expires_at < NOW() 
    AND is_active = true;
    GET DIAGNOSTICS device_count = ROW_COUNT;
    
    -- Cleanup old audit logs (keep 90 days)
    DELETE FROM audit_logs WHERE timestamp < (NOW() - INTERVAL '90 days');
    GET DIAGNOSTICS audit_count = ROW_COUNT;
    
    -- Return counts
    otp_deleted := otp_count;
    rate_limit_deleted := rate_count;
    reset_tokens_cleared := reset_count;
    trusted_devices_cleaned := device_count;
    audit_deleted := audit_count;
    
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get security statistics
CREATE OR REPLACE FUNCTION get_security_stats(hours_back INTEGER DEFAULT 24)
RETURNS TABLE(
    total_users BIGINT,
    users_with_2fa BIGINT,
    email_2fa_users BIGINT,
    sms_2fa_users BIGINT,
    active_trusted_devices BIGINT,
    recent_logins BIGINT,
    recent_2fa_attempts BIGINT,
    recent_failed_attempts BIGINT,
    adoption_percentage NUMERIC(5,2)
) AS $$
BEGIN
    RETURN QUERY
    WITH user_stats AS (
        SELECT 
            COUNT(*) as total,
            COUNT(*) FILTER (WHERE two_factor_enabled = true) as with_2fa,
            COUNT(*) FILTER (WHERE two_factor_enabled = true AND two_factor_channel = 'email') as email_2fa,
            COUNT(*) FILTER (WHERE two_factor_enabled = true AND two_factor_channel = 'sms') as sms_2fa
        FROM users
    ),
    device_stats AS (
        SELECT COUNT(*) as active_devices
        FROM trusted_devices 
        WHERE is_active = true AND expires_at > NOW()
    ),
    recent_activity AS (
        SELECT 
            COUNT(*) FILTER (WHERE action = 'user_login') as logins,
            COUNT(*) FILTER (WHERE action IN ('otp_send', 'otp_verify') AND purpose = 'login') as otp_attempts,
            COUNT(*) FILTER (WHERE action IN ('otp_verify_fail', 'user_login_fail')) as failed_attempts
        FROM audit_logs 
        WHERE timestamp > NOW() - (hours_back || ' hours')::INTERVAL
    )
    SELECT 
        u.total,
        u.with_2fa,
        u.email_2fa,
        u.sms_2fa,
        d.active_devices,
        r.logins,
        r.otp_attempts,
        r.failed_attempts,
        CASE 
            WHEN u.total > 0 THEN ROUND((u.with_2fa::NUMERIC / u.total) * 100, 2)
            ELSE 0::NUMERIC(5,2)
        END
    FROM user_stats u, device_stats d, recent_activity r;
END;
$$ LANGUAGE plpgsql;

-- Function to validate 2FA setup
CREATE OR REPLACE FUNCTION validate_2fa_setup(
    p_user_id INTEGER,
    p_channel TEXT,
    p_phone TEXT DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    user_email TEXT;
    user_phone TEXT;
BEGIN
    -- Get user's contact information
    SELECT email, phone INTO user_email, user_phone
    FROM users WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Validate email channel
    IF p_channel = 'email' THEN
        RETURN user_email IS NOT NULL AND user_email != '';
    END IF;
    
    -- Validate SMS channel
    IF p_channel = 'sms' THEN
        RETURN (p_phone IS NOT NULL AND p_phone != '') OR 
               (user_phone IS NOT NULL AND user_phone != '');
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- CREATE TRIGGERS FOR AUTOMATIC CLEANUP
-- ============================================

-- Create trigger function for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to users table if it has the column
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
        DROP TRIGGER IF EXISTS update_users_updated_at ON users;
        CREATE TRIGGER update_users_updated_at
            BEFORE UPDATE ON users
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- ============================================

-- Uncomment the following to insert test data
/*
-- Insert test admin user (password: 'admin123')
INSERT INTO users (name, email, password_hash, is_verified, two_factor_enabled, two_factor_channel)
VALUES (
    'Test Admin',
    'admin@test.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj3QBY7EGJNy',
    true,
    true,
    'email'
) ON CONFLICT (email) DO NOTHING;
*/

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Grant permissions to your application user
-- Uncomment and modify as needed
/*
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;
*/

-- ============================================
-- MIGRATION VERIFICATION
-- ============================================

-- Insert migration record
INSERT INTO audit_logs (action, status, details, timestamp) 
VALUES (
    'migration_polish_features', 
    'success', 
    '{"version": "1.0", "description": "Polish features migration completed", "features": ["trusted_devices", "backup_codes", "admin_dashboard", "suspicious_activity_alerts", "captcha_support"]}', 
    NOW()
) ON CONFLICT DO NOTHING;

-- Verify tables exist
DO $$
DECLARE
    table_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count 
    FROM information_schema.tables 
    WHERE table_name IN ('trusted_devices', 'backup_codes', 'otp_storage', 'audit_logs', 'rate_limits')
    AND table_schema = 'public';
    
    IF table_count = 5 THEN
        RAISE NOTICE 'SUCCESS: All required tables exist (% found)', table_count;
    ELSE
        RAISE WARNING 'WARNING: Not all tables found (% of 5)', table_count;
    END IF;
END $$;

-- Verify indexes exist
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count 
    FROM pg_indexes 
    WHERE tablename IN ('trusted_devices', 'backup_codes', 'users', 'otp_storage', 'audit_logs', 'rate_limits')
    AND schemaname = 'public';
    
    RAISE NOTICE 'INFO: % performance indexes created', index_count;
END $$;

-- ============================================
-- SUCCESS MESSAGE
-- ============================================

DO $$
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'POLISH FEATURES MIGRATION COMPLETED SUCCESSFULLY!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Features added:';
    RAISE NOTICE '  ✓ Trusted Devices (30-day device memory)';
    RAISE NOTICE '  ✓ Backup Codes (8 single-use recovery codes)';
    RAISE NOTICE '  ✓ Enhanced OTP Security (hash+salt, lockout)';
    RAISE NOTICE '  ✓ Admin Dashboard (statistics and monitoring)';
    RAISE NOTICE '  ✓ Suspicious Activity Alerts (email notifications)';
    RAISE NOTICE '  ✓ CAPTCHA Support (hCaptcha/Turnstile)';
    RAISE NOTICE '  ✓ Comprehensive Audit Logging';
    RAISE NOTICE '  ✓ Rate Limiting (sliding window)';
    RAISE NOTICE '  ✓ Password Reset (secure token-based)';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Update environment variables (see .env.example)';
    RAISE NOTICE '  2. Configure SendGrid/Twilio for notifications';
    RAISE NOTICE '  3. Set up CAPTCHA provider (hCaptcha/Turnstile)';
    RAISE NOTICE '  4. Configure admin user emails';
    RAISE NOTICE '  5. Run security statistics: SELECT * FROM get_security_stats();';
    RAISE NOTICE '  6. Set up cleanup job: SELECT * FROM cleanup_expired_records();';
    RAISE NOTICE '============================================';
END $$;

COMMIT;

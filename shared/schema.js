"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.insertForumThreadSchema = exports.insertResourceSchema = exports.insertGroupSchema = exports.insertEventSchema = exports.insertInternshipSchema = exports.adminStatsFilterSchema = exports.captchaSchema = exports.backupCodeVerifySchema = exports.trustedDeviceSchema = exports.loginWith2FASchema = exports.loginSchema = exports.twoFactorVerifySchema = exports.twoFactorRequestSchema = exports.twoFactorSetupSchema = exports.changePasswordSchema = exports.resetPasswordSchema = exports.forgotPasswordSchema = exports.auditLogSchema = exports.secureOtpSchema = exports.sendOtpSchema = exports.otpVerificationSchema = exports.insertUserSchema = exports.rate_limits = exports.backup_codes = exports.trusted_devices = exports.audit_logs = exports.otp_storage = exports.forum_replies = exports.forum_threads = exports.resources = exports.groups = exports.events = exports.internships = exports.companies = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_zod_1 = require("drizzle-zod");
const zod_1 = require("zod");
// Users table - for authentication and user management
exports.users = (0, pg_core_1.pgTable)("users", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    email: (0, pg_core_1.text)("email").notNull().unique(),
    phone: (0, pg_core_1.text)("phone"), // Optional phone number for OTP
    password_hash: (0, pg_core_1.text)("password_hash").notNull(),
    avatar_url: (0, pg_core_1.text)("avatar_url"),
    is_verified: (0, pg_core_1.boolean)("is_verified").default(false).notNull(), // Email/phone verification status
    otp_code: (0, pg_core_1.text)("otp_code"), // Current OTP code (deprecated - use otp_storage)
    otp_expires_at: (0, pg_core_1.timestamp)("otp_expires_at"), // OTP expiration time (deprecated - use otp_storage)
    otp_type: (0, pg_core_1.text)("otp_type"), // 'email' or 'sms' - which method was used for OTP (deprecated - use otp_storage)
    reset_password_token: (0, pg_core_1.text)("reset_password_token"), // SHA-256 hash of reset token
    reset_password_expires: (0, pg_core_1.timestamp)("reset_password_expires"), // Reset token expiration
    last_password_reset: (0, pg_core_1.timestamp)("last_password_reset"), // Track when password was last reset
    two_factor_enabled: (0, pg_core_1.boolean)("two_factor_enabled").default(false).notNull(), // 2FA enabled flag
    two_factor_channel: (0, pg_core_1.text)("two_factor_channel"), // 'email' or 'sms' - preferred 2FA method
    two_factor_backup_enabled: (0, pg_core_1.boolean)("two_factor_backup_enabled").default(false).notNull(), // Backup codes enabled
    last_2fa_at: (0, pg_core_1.timestamp)("last_2fa_at"), // Last successful 2FA timestamp
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Companies table - for internships and jobs
exports.companies = (0, pg_core_1.pgTable)("companies", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    logo_url: (0, pg_core_1.text)("logo_url"),
    website: (0, pg_core_1.text)("website"),
    description: (0, pg_core_1.text)("description"),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Internships/Jobs table
exports.internships = (0, pg_core_1.pgTable)("internships", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    role: (0, pg_core_1.text)("role").notNull(),
    company_id: (0, pg_core_1.integer)("company_id").references(() => exports.companies.id),
    location: (0, pg_core_1.text)("location").notNull(),
    type: (0, pg_core_1.text)("type").notNull(), // full-time, part-time, internship, contract
    domain: (0, pg_core_1.text)("domain").notNull(), // tech, design, marketing, etc.
    description: (0, pg_core_1.text)("description").notNull(),
    requirements: (0, pg_core_1.text)("requirements"),
    salary_range: (0, pg_core_1.text)("salary_range"),
    apply_link: (0, pg_core_1.text)("apply_link").notNull(),
    posted_date: (0, pg_core_1.timestamp)("posted_date").defaultNow().notNull(),
    deadline: (0, pg_core_1.timestamp)("deadline"),
    logo: (0, pg_core_1.text)("logo"),
    company_color: (0, pg_core_1.text)("company_color"),
    is_active: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    created_by: (0, pg_core_1.integer)("created_by").references(() => exports.users.id),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Events table
exports.events = (0, pg_core_1.pgTable)("events", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    event_date: (0, pg_core_1.timestamp)("event_date").notNull(),
    location: (0, pg_core_1.text)("location").notNull(),
    event_type: (0, pg_core_1.text)("event_type").notNull(), // workshop, seminar, networking, etc.
    organizer: (0, pg_core_1.text)("organizer").notNull(),
    registration_link: (0, pg_core_1.text)("registration_link"),
    max_participants: (0, pg_core_1.integer)("max_participants"),
    is_active: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
    created_by: (0, pg_core_1.integer)("created_by").references(() => exports.users.id),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Forums/Groups table
exports.groups = (0, pg_core_1.pgTable)("groups", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    name: (0, pg_core_1.text)("name").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    category: (0, pg_core_1.text)("category").notNull(), // study, project, social, etc.
    privacy: (0, pg_core_1.text)("privacy").notNull(), // public, private
    max_members: (0, pg_core_1.integer)("max_members"),
    created_by: (0, pg_core_1.integer)("created_by").references(() => exports.users.id),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Resources table
exports.resources = (0, pg_core_1.pgTable)("resources", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.text)("title").notNull(),
    description: (0, pg_core_1.text)("description").notNull(),
    resource_type: (0, pg_core_1.text)("resource_type").notNull(), // pdf, link, video, etc.
    resource_url: (0, pg_core_1.text)("resource_url").notNull(),
    category: (0, pg_core_1.text)("category").notNull(), // academic, career, skill-building, etc.
    tags: (0, pg_core_1.text)("tags"), // JSON array of tags
    upvotes: (0, pg_core_1.integer)("upvotes").default(0).notNull(),
    posted_by: (0, pg_core_1.integer)("posted_by").references(() => exports.users.id),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Forums/Discussion threads
exports.forum_threads = (0, pg_core_1.pgTable)("forum_threads", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    title: (0, pg_core_1.text)("title").notNull(),
    content: (0, pg_core_1.text)("content").notNull(),
    category: (0, pg_core_1.text)("category").notNull(), // general, academic, career, tech, etc.
    tags: (0, pg_core_1.text)("tags"), // JSON array of tags
    upvotes: (0, pg_core_1.integer)("upvotes").default(0).notNull(),
    reply_count: (0, pg_core_1.integer)("reply_count").default(0).notNull(),
    created_by: (0, pg_core_1.integer)("created_by").references(() => exports.users.id),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    updated_at: (0, pg_core_1.timestamp)("updated_at").defaultNow().notNull(),
});
// Forum replies
exports.forum_replies = (0, pg_core_1.pgTable)("forum_replies", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    thread_id: (0, pg_core_1.integer)("thread_id").references(() => exports.forum_threads.id),
    content: (0, pg_core_1.text)("content").notNull(),
    upvotes: (0, pg_core_1.integer)("upvotes").default(0).notNull(),
    created_by: (0, pg_core_1.integer)("created_by").references(() => exports.users.id),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Secure OTP storage table with hashing and tracking
exports.otp_storage = (0, pg_core_1.pgTable)("otp_storage", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    user_id: (0, pg_core_1.integer)("user_id").references(() => exports.users.id), // For tracking per-user limits
    contact_info: (0, pg_core_1.text)("contact_info").notNull(), // email or phone (not unique for multiple purposes)
    channel: (0, pg_core_1.text)("channel").notNull(), // 'email' or 'sms'
    purpose: (0, pg_core_1.text)("purpose").notNull(), // 'signup', 'login', 'reset'
    otp_hash: (0, pg_core_1.text)("otp_hash").notNull(), // SHA-256 hash of OTP
    salt: (0, pg_core_1.text)("salt").notNull(), // Random salt for hashing
    expires_at: (0, pg_core_1.timestamp)("expires_at").notNull(),
    attempts: (0, pg_core_1.integer)("attempts").default(0).notNull(), // Failed verification attempts
    max_attempts: (0, pg_core_1.integer)("max_attempts").default(5).notNull(), // Max attempts before lock
    locked_until: (0, pg_core_1.timestamp)("locked_until"), // Hard lock timestamp
    last_sent_at: (0, pg_core_1.timestamp)("last_sent_at").defaultNow().notNull(), // For resend cooldown
    ip_address: (0, pg_core_1.text)("ip_address"), // Request IP for security
    user_agent: (0, pg_core_1.text)("user_agent"), // User agent for tracking
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Audit log for security events
exports.audit_logs = (0, pg_core_1.pgTable)("audit_logs", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    user_id: (0, pg_core_1.integer)("user_id").references(() => exports.users.id),
    action: (0, pg_core_1.text)("action").notNull(), // 'otp_send', 'otp_verify', 'otp_fail', etc.
    channel: (0, pg_core_1.text)("channel"), // 'email', 'sms'
    purpose: (0, pg_core_1.text)("purpose"), // 'signup', 'login', 'reset'
    status: (0, pg_core_1.text)("status").notNull(), // 'success', 'failure', 'blocked'
    ip_address: (0, pg_core_1.text)("ip_address"),
    user_agent: (0, pg_core_1.text)("user_agent"),
    details: (0, pg_core_1.text)("details"), // JSON string with additional context
    timestamp: (0, pg_core_1.timestamp)("timestamp").defaultNow().notNull(),
});
// Trusted devices table - for remembering devices to skip 2FA
exports.trusted_devices = (0, pg_core_1.pgTable)("trusted_devices", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    user_id: (0, pg_core_1.integer)("user_id").references(() => exports.users.id).notNull(),
    device_id: (0, pg_core_1.text)("device_id").notNull().unique(), // UUID for device identification
    device_name: (0, pg_core_1.text)("device_name"), // Optional user-friendly name
    ip_address: (0, pg_core_1.text)("ip_address"),
    user_agent: (0, pg_core_1.text)("user_agent"),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
    expires_at: (0, pg_core_1.timestamp)("expires_at").notNull(), // 30 days from creation
    last_used_at: (0, pg_core_1.timestamp)("last_used_at").defaultNow().notNull(),
    is_active: (0, pg_core_1.boolean)("is_active").default(true).notNull(),
});
// Backup codes table - for 2FA recovery
exports.backup_codes = (0, pg_core_1.pgTable)("backup_codes", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    user_id: (0, pg_core_1.integer)("user_id").references(() => exports.users.id).notNull(),
    code_hash: (0, pg_core_1.text)("code_hash").notNull(), // SHA-256 hash of the backup code
    used: (0, pg_core_1.boolean)("used").default(false).notNull(),
    used_at: (0, pg_core_1.timestamp)("used_at"),
    created_at: (0, pg_core_1.timestamp)("created_at").defaultNow().notNull(),
});
// Rate limiting storage
exports.rate_limits = (0, pg_core_1.pgTable)("rate_limits", {
    id: (0, pg_core_1.serial)("id").primaryKey(),
    key: (0, pg_core_1.text)("key").notNull().unique(), // IP + route or user + action
    requests: (0, pg_core_1.integer)("requests").default(1).notNull(),
    window_start: (0, pg_core_1.timestamp)("window_start").defaultNow().notNull(),
    expires_at: (0, pg_core_1.timestamp)("expires_at").notNull(),
});
// Zod schemas for validation
exports.insertUserSchema = (0, drizzle_zod_1.createInsertSchema)(exports.users).pick({
    name: true,
    email: true,
    phone: true,
    password_hash: true,
    avatar_url: true,
});
// Schema for OTP verification
exports.otpVerificationSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    otp_code: zod_1.z.string().length(6),
    purpose: zod_1.z.enum(['signup', 'login', 'reset']).default('signup'),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided"
});
// Schema for sending OTP
exports.sendOtpSchema = zod_1.z.object({
    email: zod_1.z.string().email().optional(),
    phone: zod_1.z.string().optional(),
    channel: zod_1.z.enum(['email', 'sms']),
    purpose: zod_1.z.enum(['signup', 'login', 'reset']).default('signup'),
}).refine(data => data.email || data.phone, {
    message: "Either email or phone must be provided"
});
// Schema for secure OTP storage
exports.secureOtpSchema = zod_1.z.object({
    user_id: zod_1.z.number().optional(),
    contact_info: zod_1.z.string(),
    channel: zod_1.z.enum(['email', 'sms']),
    purpose: zod_1.z.enum(['signup', 'login', 'reset']),
    otp_hash: zod_1.z.string(),
    salt: zod_1.z.string(),
    expires_at: zod_1.z.date(),
    ip_address: zod_1.z.string().optional(),
    user_agent: zod_1.z.string().optional(),
});
// Schema for audit logging
exports.auditLogSchema = zod_1.z.object({
    user_id: zod_1.z.number().optional(),
    action: zod_1.z.string(),
    channel: zod_1.z.enum(['email', 'sms']).optional(),
    purpose: zod_1.z.enum(['signup', 'login', 'reset']).optional(),
    status: zod_1.z.enum(['success', 'failure', 'blocked']),
    ip_address: zod_1.z.string().optional(),
    user_agent: zod_1.z.string().optional(),
    details: zod_1.z.string().optional(),
});
// Schema for forgot password request
exports.forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Valid email is required" }),
});
// Schema for reset password request
exports.resetPasswordSchema = zod_1.z.object({
    token: zod_1.z.string().min(64, { message: "Invalid reset token" }),
    password: zod_1.z.string()
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    }),
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
// Schema for password change (authenticated users)
exports.changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1, { message: "Current password is required" }),
    newPassword: zod_1.z.string()
        .min(8, { message: "Password must be at least 8 characters" })
        .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: "Password must contain at least one uppercase letter, one lowercase letter, and one number"
    }),
    confirmPassword: zod_1.z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
});
// Schema for 2FA setup/configuration
exports.twoFactorSetupSchema = zod_1.z.object({
    enabled: zod_1.z.boolean(),
    channel: zod_1.z.enum(['email', 'sms']).optional(),
    phone: zod_1.z.string().optional(),
}).refine((data) => {
    if (data.enabled && data.channel === 'sms') {
        return data.phone && data.phone.length > 0;
    }
    return true;
}, {
    message: "Phone number is required for SMS 2FA",
    path: ["phone"],
});
// Schema for 2FA OTP request
exports.twoFactorRequestSchema = zod_1.z.object({
    userId: zod_1.z.number().positive(),
    channel: zod_1.z.enum(['email', 'sms']).optional(), // Optional override of user's preferred channel
});
// Schema for 2FA OTP verification
exports.twoFactorVerifySchema = zod_1.z.object({
    userId: zod_1.z.number().positive(),
    otp: zod_1.z.string().length(6, { message: "OTP must be exactly 6 digits" }).regex(/^\d+$/, { message: "OTP must contain only numbers" }),
});
// Schema for login with potential 2FA
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email({ message: "Valid email is required" }),
    password: zod_1.z.string().min(1, { message: "Password is required" }),
});
// Schema for 2FA login completion
exports.loginWith2FASchema = zod_1.z.object({
    userId: zod_1.z.number().positive(),
    otp: zod_1.z.string().length(6, { message: "OTP must be exactly 6 digits" }).regex(/^\d+$/, { message: "OTP must contain only numbers" }),
    trustDevice: zod_1.z.boolean().optional(), // Flag to trust this device
});
// Schema for trusted device operations
exports.trustedDeviceSchema = zod_1.z.object({
    deviceId: zod_1.z.string().uuid({ message: "Valid device ID required" }),
    deviceName: zod_1.z.string().min(1).max(100).optional(),
});
// Schema for backup code verification
exports.backupCodeVerifySchema = zod_1.z.object({
    userId: zod_1.z.number().positive(),
    backupCode: zod_1.z.string().length(8, { message: "Backup code must be exactly 8 characters" }).regex(/^[A-Z0-9]+$/, { message: "Invalid backup code format" }),
});
// Schema for CAPTCHA verification
exports.captchaSchema = zod_1.z.object({
    captchaToken: zod_1.z.string().min(1, { message: "CAPTCHA verification required" }),
});
// Schema for admin statistics filters
exports.adminStatsFilterSchema = zod_1.z.object({
    hours: zod_1.z.number().min(1).max(168).optional().default(24), // 1 hour to 1 week
    channel: zod_1.z.enum(['email', 'sms']).optional(),
    purpose: zod_1.z.enum(['signup', 'login', 'reset']).optional(),
});
exports.insertInternshipSchema = (0, drizzle_zod_1.createInsertSchema)(exports.internships).pick({
    role: true,
    company_id: true,
    location: true,
    type: true,
    domain: true,
    description: true,
    requirements: true,
    salary_range: true,
    apply_link: true,
    deadline: true,
});
exports.insertEventSchema = (0, drizzle_zod_1.createInsertSchema)(exports.events).pick({
    title: true,
    description: true,
    event_date: true,
    location: true,
    event_type: true,
    organizer: true,
    registration_link: true,
    max_participants: true,
});
exports.insertGroupSchema = (0, drizzle_zod_1.createInsertSchema)(exports.groups).pick({
    name: true,
    description: true,
    category: true,
    privacy: true,
    max_members: true,
});
exports.insertResourceSchema = (0, drizzle_zod_1.createInsertSchema)(exports.resources).pick({
    title: true,
    description: true,
    resource_type: true,
    resource_url: true,
    category: true,
    tags: true,
});
exports.insertForumThreadSchema = (0, drizzle_zod_1.createInsertSchema)(exports.forum_threads).pick({
    title: true,
    content: true,
    category: true,
    tags: true,
});
//# sourceMappingURL=schema.js.map
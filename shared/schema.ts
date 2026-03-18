import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table - for authentication and user management
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone"), // Optional phone number for OTP
  password_hash: text("password_hash").notNull(),
  avatar_url: text("avatar_url"),
  is_verified: boolean("is_verified").default(false).notNull(), // Email/phone verification status
  otp_code: text("otp_code"), // Current OTP code (deprecated - use otp_storage)
  otp_expires_at: timestamp("otp_expires_at"), // OTP expiration time (deprecated - use otp_storage)
  otp_type: text("otp_type"), // 'email' or 'sms' - which method was used for OTP (deprecated - use otp_storage)
  reset_password_token: text("reset_password_token"), // SHA-256 hash of reset token
  reset_password_expires: timestamp("reset_password_expires"), // Reset token expiration
  last_password_reset: timestamp("last_password_reset"), // Track when password was last reset
  two_factor_enabled: boolean("two_factor_enabled").default(false).notNull(), // 2FA enabled flag
  two_factor_channel: text("two_factor_channel"), // 'email' or 'sms' - preferred 2FA method
  two_factor_backup_enabled: boolean("two_factor_backup_enabled").default(false).notNull(), // Backup codes enabled
  last_2fa_at: timestamp("last_2fa_at"), // Last successful 2FA timestamp
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Companies table - for internships and jobs
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  logo_url: text("logo_url"),
  website: text("website"),
  description: text("description"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Internships/Jobs table
export const internships = pgTable("internships", {
  id: serial("id").primaryKey(),
  role: text("role").notNull(),
  company_id: integer("company_id").references(() => companies.id),
  location: text("location").notNull(),
  type: text("type").notNull(), // full-time, part-time, internship, contract
  domain: text("domain").notNull(), // tech, design, marketing, etc.
  description: text("description").notNull(),
  requirements: text("requirements"),
  salary_range: text("salary_range"),
  apply_link: text("apply_link").notNull(),
  posted_date: timestamp("posted_date").defaultNow().notNull(),
  deadline: timestamp("deadline"),
  logo: text("logo"),
  company_color: text("company_color"),
  is_active: boolean("is_active").default(true).notNull(),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  event_date: timestamp("event_date").notNull(),
  location: text("location").notNull(),
  event_type: text("event_type").notNull(), // workshop, seminar, networking, etc.
  organizer: text("organizer").notNull(),
  registration_link: text("registration_link"),
  max_participants: integer("max_participants"),
  is_active: boolean("is_active").default(true).notNull(),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Forums/Groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(), // study, project, social, etc.
  privacy: text("privacy").notNull(), // public, private
  max_members: integer("max_members"),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Resources table
export const resources = pgTable("resources", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  resource_type: text("resource_type").notNull(), // pdf, link, video, etc.
  resource_url: text("resource_url").notNull(),
  category: text("category").notNull(), // academic, career, skill-building, etc.
  tags: text("tags"), // JSON array of tags
  upvotes: integer("upvotes").default(0).notNull(),
  posted_by: integer("posted_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Forums/Discussion threads
export const forum_threads = pgTable("forum_threads", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(), // general, academic, career, tech, etc.
  tags: text("tags"), // JSON array of tags
  upvotes: integer("upvotes").default(0).notNull(),
  reply_count: integer("reply_count").default(0).notNull(),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

// Forum replies
export const forum_replies = pgTable("forum_replies", {
  id: serial("id").primaryKey(),
  thread_id: integer("thread_id").references(() => forum_threads.id),
  content: text("content").notNull(),
  upvotes: integer("upvotes").default(0).notNull(),
  created_by: integer("created_by").references(() => users.id),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Secure OTP storage table with hashing and tracking
export const otp_storage = pgTable("otp_storage", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id), // For tracking per-user limits
  contact_info: text("contact_info").notNull(), // email or phone (not unique for multiple purposes)
  channel: text("channel").notNull(), // 'email' or 'sms'
  purpose: text("purpose").notNull(), // 'signup', 'login', 'reset'
  otp_hash: text("otp_hash").notNull(), // SHA-256 hash of OTP
  salt: text("salt").notNull(), // Random salt for hashing
  expires_at: timestamp("expires_at").notNull(),
  attempts: integer("attempts").default(0).notNull(), // Failed verification attempts
  max_attempts: integer("max_attempts").default(5).notNull(), // Max attempts before lock
  locked_until: timestamp("locked_until"), // Hard lock timestamp
  last_sent_at: timestamp("last_sent_at").defaultNow().notNull(), // For resend cooldown
  ip_address: text("ip_address"), // Request IP for security
  user_agent: text("user_agent"), // User agent for tracking
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Audit log for security events
export const audit_logs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // 'otp_send', 'otp_verify', 'otp_fail', etc.
  channel: text("channel"), // 'email', 'sms'
  purpose: text("purpose"), // 'signup', 'login', 'reset'
  status: text("status").notNull(), // 'success', 'failure', 'blocked'
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  details: text("details"), // JSON string with additional context
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

// Trusted devices table - for remembering devices to skip 2FA
export const trusted_devices = pgTable("trusted_devices", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  device_id: text("device_id").notNull().unique(), // UUID for device identification
  device_name: text("device_name"), // Optional user-friendly name
  ip_address: text("ip_address"),
  user_agent: text("user_agent"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  expires_at: timestamp("expires_at").notNull(), // 30 days from creation
  last_used_at: timestamp("last_used_at").defaultNow().notNull(),
  is_active: boolean("is_active").default(true).notNull(),
});

// Backup codes table - for 2FA recovery
export const backup_codes = pgTable("backup_codes", {
  id: serial("id").primaryKey(),
  user_id: integer("user_id").references(() => users.id).notNull(),
  code_hash: text("code_hash").notNull(), // SHA-256 hash of the backup code
  used: boolean("used").default(false).notNull(),
  used_at: timestamp("used_at"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

// Rate limiting storage
export const rate_limits = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(), // IP + route or user + action
  requests: integer("requests").default(1).notNull(),
  window_start: timestamp("window_start").defaultNow().notNull(),
  expires_at: timestamp("expires_at").notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  phone: true,
  password_hash: true,
  avatar_url: true,
});

// Schema for OTP verification
export const otpVerificationSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  otp_code: z.string().length(6),
  purpose: z.enum(['signup', 'login', 'reset']).default('signup'),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone must be provided"
});

// Schema for sending OTP
export const sendOtpSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  channel: z.enum(['email', 'sms']),
  purpose: z.enum(['signup', 'login', 'reset']).default('signup'),
}).refine(data => data.email || data.phone, {
  message: "Either email or phone must be provided"
});

// Schema for secure OTP storage
export const secureOtpSchema = z.object({
  user_id: z.number().optional(),
  contact_info: z.string(),
  channel: z.enum(['email', 'sms']),
  purpose: z.enum(['signup', 'login', 'reset']),
  otp_hash: z.string(),
  salt: z.string(),
  expires_at: z.date(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
});

// Schema for audit logging
export const auditLogSchema = z.object({
  user_id: z.number().optional(),
  action: z.string(),
  channel: z.enum(['email', 'sms']).optional(),
  purpose: z.enum(['signup', 'login', 'reset']).optional(),
  status: z.enum(['success', 'failure', 'blocked']),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  details: z.string().optional(),
});

// Schema for forgot password request
export const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Valid email is required" }),
});

// Schema for reset password request
export const resetPasswordSchema = z.object({
  token: z.string().min(64, { message: "Invalid reset token" }),
  password: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
    }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Schema for password change (authenticated users)
export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required" }),
  newPassword: z.string()
    .min(8, { message: "Password must be at least 8 characters" })
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, { 
      message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
    }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Schema for 2FA setup/configuration
export const twoFactorSetupSchema = z.object({
  enabled: z.boolean(),
  channel: z.enum(['email', 'sms']).optional(),
  phone: z.string().optional(),
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
export const twoFactorRequestSchema = z.object({
  userId: z.number().positive(),
  channel: z.enum(['email', 'sms']).optional(), // Optional override of user's preferred channel
});

// Schema for 2FA OTP verification
export const twoFactorVerifySchema = z.object({
  userId: z.number().positive(),
  otp: z.string().length(6, { message: "OTP must be exactly 6 digits" }).regex(/^\d+$/, { message: "OTP must contain only numbers" }),
});

// Schema for login with potential 2FA
export const loginSchema = z.object({
  email: z.string().email({ message: "Valid email is required" }),
  password: z.string().min(1, { message: "Password is required" }),
});

// Schema for 2FA login completion
export const loginWith2FASchema = z.object({
  userId: z.number().positive(),
  otp: z.string().length(6, { message: "OTP must be exactly 6 digits" }).regex(/^\d+$/, { message: "OTP must contain only numbers" }),
  trustDevice: z.boolean().optional(), // Flag to trust this device
});

// Schema for trusted device operations
export const trustedDeviceSchema = z.object({
  deviceId: z.string().uuid({ message: "Valid device ID required" }),
  deviceName: z.string().min(1).max(100).optional(),
});

// Schema for backup code verification
export const backupCodeVerifySchema = z.object({
  userId: z.number().positive(),
  backupCode: z.string().length(8, { message: "Backup code must be exactly 8 characters" }).regex(/^[A-Z0-9]+$/, { message: "Invalid backup code format" }),
});

// Schema for CAPTCHA verification
export const captchaSchema = z.object({
  captchaToken: z.string().min(1, { message: "CAPTCHA verification required" }),
});

// Schema for admin statistics filters
export const adminStatsFilterSchema = z.object({
  hours: z.number().min(1).max(168).optional().default(24), // 1 hour to 1 week
  channel: z.enum(['email', 'sms']).optional(),
  purpose: z.enum(['signup', 'login', 'reset']).optional(),
});

export const insertInternshipSchema = createInsertSchema(internships).pick({
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

export const insertEventSchema = createInsertSchema(events).pick({
  title: true,
  description: true,
  event_date: true,
  location: true,
  event_type: true,
  organizer: true,
  registration_link: true,
  max_participants: true,
});

export const insertGroupSchema = createInsertSchema(groups).pick({
  name: true,
  description: true,
  category: true,
  privacy: true,
  max_members: true,
});

export const insertResourceSchema = createInsertSchema(resources).pick({
  title: true,
  description: true,
  resource_type: true,
  resource_url: true,
  category: true,
  tags: true,
});

export const insertForumThreadSchema = createInsertSchema(forum_threads).pick({
  title: true,
  content: true,
  category: true,
  tags: true,
});

// TypeScript types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Internship = typeof internships.$inferSelect;
export type InsertInternship = z.infer<typeof insertInternshipSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Resource = typeof resources.$inferSelect;
export type InsertResource = z.infer<typeof insertResourceSchema>;
export type ForumThread = typeof forum_threads.$inferSelect;
export type InsertForumThread = z.infer<typeof insertForumThreadSchema>;
export type ForumReply = typeof forum_replies.$inferSelect;

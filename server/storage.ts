// ...existing code...
import { db } from './db/index';
import pool from './db/index';

export class PostgreSQLStorage {
  // Get groups for a user (member or creator)
  async getGroupsForUser(userId: number) {
    try {
      const res = await pool.query(
        `SELECT g.* FROM groups g
         LEFT JOIN group_members gm ON g.id = gm.group_id
         WHERE g.created_by = $1 OR gm.user_id = $1
         GROUP BY g.id`
        , [userId]
      );
      return res.rows;
    } catch (error) {
      console.error('Error getting user groups:', error);
      return [];
    }
  }

  // Join a group
  async joinGroup(userId: number, groupId: number) {
    try {
      // Check if already a member
      const check = await pool.query(
        'SELECT id FROM group_members WHERE user_id = $1 AND group_id = $2',
        [userId, groupId]
      );
      if (check.rows.length > 0) return;
      await pool.query(
        'INSERT INTO group_members (user_id, group_id, role) VALUES ($1, $2, $3)',
        [userId, groupId, 'member']
      );
    } catch (error) {
      console.error('Error joining group:', error);
      throw new Error('Failed to join group');
    }
  }
  // User operations
  async getUser(id: number) {
    try {
      const res = await pool.query('SELECT id, name, email, avatar_url, created_at FROM users WHERE id = $1', [id]);
      return res.rows[0] || null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getUserByEmail(email: string) {
    try {
      const res = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      return res.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  async createUser(userData: { 
    name: string; 
    email: string; 
    phone?: string | null;
    password_hash: string; 
    avatar_url?: string | null;
    is_verified?: boolean;
  }) {
    try {
      const res = await pool.query(
        'INSERT INTO users (name, email, phone, password_hash, avatar_url, is_verified) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, phone, avatar_url, is_verified, created_at',
        [userData.name, userData.email, userData.phone || null, userData.password_hash, userData.avatar_url || null, userData.is_verified || false]
      );
      return res.rows[0];
    } catch (err: any) {
      // Log full error details
      console.error('Error creating user:', err);
      if (err && err.message) console.error('Message:', err.message);
      if (err && err.code) console.error('Code:', err.code);
      if (err && err.stack) console.error('Stack:', err.stack);

      // Unique constraint violation (e.g., email already exists)
      if (err.code === '23505') {
        throw new Error('Email already registered');
      }
      // Not-null violation
      if (err.code === '23502') {
        // err.column is not always present, so try to extract from err.message
        let field = err.column;
        if (!field && err.message) {
          const match = err.message.match(/null value in column "([^"]+)"/);
          if (match) field = match[1];
        }
        throw new Error(`Missing required field: ${field || 'unknown'}`);
      }
      // Other errors
      throw new Error(`Failed to create user: ${err.message || err}`);
    }
  }

  // Company operations
  async getCompanies() {
    try {
      const res = await pool.query('SELECT * FROM companies ORDER BY name');
      return res.rows;
    } catch (error) {
      console.error('Error getting companies:', error);
      return [];
    }
  }

  async createCompany(companyData: {
    name: string;
    logo_url?: string;
    website?: string;
    description?: string;
  }) {
    try {
      const res = await pool.query(
        'INSERT INTO companies (name, logo_url, website, description) VALUES ($1, $2, $3, $4) RETURNING *',
        [companyData.name, companyData.logo_url, companyData.website, companyData.description]
      );
      return res.rows[0];
    } catch (error) {
      console.error('Error creating company:', error);
      throw new Error('Failed to create company');
    }
  }

  // Internship operations
  async getInternships(filters?: {
    type?: string;
    domain?: string;
    location?: string;
    limit?: number;
  }) {
    try {
      let query = `
        SELECT i.*, c.name as company_name, c.logo_url as company_logo, c.website as company_website
        FROM internships i 
        LEFT JOIN companies c ON i.company_id = c.id 
        WHERE i.is_active = true
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.type) {
        query += ` AND i.type = $${paramIndex}`;
        params.push(filters.type);
        paramIndex++;
      }
      if (filters?.domain) {
        query += ` AND i.domain = $${paramIndex}`;
        params.push(filters.domain);
        paramIndex++;
      }
      if (filters?.location) {
        query += ` AND i.location ILIKE $${paramIndex}`;
        params.push(`%${filters.location}%`);
        paramIndex++;
      }

      query += ` ORDER BY i.posted_date DESC`;
      
      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      const res = await pool.query(query, params);
      return res.rows;
    } catch (error) {
      console.error('Error getting internships:', error);
      return [];
    }
  }

  async createInternship(internshipData: {
    role: string;
    company_id: number;
    location: string;
    type: string;
    domain: string;
    description: string;
    requirements?: string;
    salary_range?: string;
    apply_link: string;
    deadline?: Date;
    logo?: string;
    company_color?: string;
    created_by: number;
  }) {
    try {
      const res = await pool.query(
        `INSERT INTO internships 
         (role, company_id, location, type, domain, description, requirements, salary_range, apply_link, deadline, logo, company_color, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          internshipData.role,
          internshipData.company_id,
          internshipData.location,
          internshipData.type,
          internshipData.domain,
          internshipData.description,
          internshipData.requirements,
          internshipData.salary_range,
          internshipData.apply_link,
          internshipData.deadline,
          internshipData.logo,
          internshipData.company_color,
          internshipData.created_by
        ]
      );
      return res.rows[0];
    } catch (error) {
      console.error('Error creating internship:', error);
      throw new Error('Failed to create internship');
    }
  }

  // Event operations
  async getEvents(filters?: {
    event_type?: string;
    limit?: number;
  }) {
    try {
      let query = `
        SELECT e.*, u.name as creator_name
        FROM events e 
        LEFT JOIN users u ON e.created_by = u.id 
        WHERE e.is_active = true
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (filters?.event_type) {
        query += ` AND e.event_type = $${paramIndex}`;
        params.push(filters.event_type);
        paramIndex++;
      }

      query += ` ORDER BY e.event_date ASC`;
      
      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      const res = await pool.query(query, params);
      return res.rows;
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  async createEvent(eventData: {
    title: string;
    description: string;
    event_date: Date;
    location: string;
    event_type: string;
    organizer: string;
    registration_link?: string;
    max_participants?: number;
    created_by: number;
  }) {
    try {
      const res = await pool.query(
        `INSERT INTO events 
         (title, description, event_date, location, event_type, organizer, registration_link, max_participants, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [
          eventData.title,
          eventData.description,
          eventData.event_date,
          eventData.location,
          eventData.event_type,
          eventData.organizer,
          eventData.registration_link,
          eventData.max_participants,
          eventData.created_by
        ]
      );
      return res.rows[0];
    } catch (error) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create event');
    }
  }

  // Group operations
  async getGroups(filters?: {
    category?: string;
    privacy?: string;
    limit?: number;
  }) {
    try {
      let query = `
        SELECT g.*, u.name as creator_name
        FROM groups g 
        LEFT JOIN users u ON g.created_by = u.id
      `;
      const params: any[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;

      if (filters?.category) {
        conditions.push(`g.category = $${paramIndex}`);
        params.push(filters.category);
        paramIndex++;
      }
      if (filters?.privacy) {
        conditions.push(`g.privacy = $${paramIndex}`);
        params.push(filters.privacy);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY g.created_at DESC`;
      
      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      const res = await pool.query(query, params);
      return res.rows;
    } catch (error) {
      console.error('Error getting groups:', error);
      return [];
    }
  }

  async createGroup(groupData: {
    name: string;
    description: string;
    category: string;
    privacy: string;
    max_members?: number;
    created_by: number;
  }) {
    try {
      const res = await pool.query(
        `INSERT INTO groups (name, description, category, privacy, max_members, created_by)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [
          groupData.name,
          groupData.description,
          groupData.category,
          groupData.privacy,
          groupData.max_members,
          groupData.created_by
        ]
      );
      return res.rows[0];
    } catch (error) {
      console.error('Error creating group:', error);
      throw new Error('Failed to create group');
    }
  }

  // Resource operations
  async getResources(filters?: {
    category?: string;
    resource_type?: string;
    limit?: number;
  }) {
    try {
      let query = `
        SELECT r.*, u.name as poster_name
        FROM resources r 
        LEFT JOIN users u ON r.posted_by = u.id
      `;
      const params: any[] = [];
      const conditions: string[] = [];
      let paramIndex = 1;

      if (filters?.category) {
        conditions.push(`r.category = $${paramIndex}`);
        params.push(filters.category);
        paramIndex++;
      }
      if (filters?.resource_type) {
        conditions.push(`r.resource_type = $${paramIndex}`);
        params.push(filters.resource_type);
        paramIndex++;
      }

      if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`;
      }

      query += ` ORDER BY r.upvotes DESC, r.created_at DESC`;
      
      if (filters?.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(filters.limit);
      }

      const res = await pool.query(query, params);
      return res.rows;
    } catch (error) {
      console.error('Error getting resources:', error);
      return [];
    }
  }

  async createResource(resourceData: {
    title: string;
    resource_url: string;
    description: string;
    resource_type: string;
    category: string;
    tags?: string;
    posted_by: number;
  }) {
    try {
      const res = await pool.query(
        `INSERT INTO resources (title, resource_url, description, resource_type, category, tags, posted_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [
          resourceData.title,
          resourceData.resource_url,
          resourceData.description,
          resourceData.resource_type,
          resourceData.category,
          resourceData.tags,
          resourceData.posted_by
        ]
      );
      return res.rows[0];
    } catch (error) {
      console.error('Error creating resource:', error);
      throw new Error('Failed to create resource');
    }
  }

  // Forum operations (using forum_threads table)
  async getForumThreads(limit?: number) {
    try {
      let query = `
        SELECT ft.*, u.name as author_name, u.avatar_url as author_avatar
        FROM forum_threads ft 
        LEFT JOIN users u ON ft.created_by = u.id
        ORDER BY ft.created_at DESC
      `;
      const params: any[] = [];

      if (limit) {
        query += ` LIMIT $1`;
        params.push(limit);
      }

      const res = await pool.query(query, params);
      return res.rows;
    } catch (error) {
      console.error('Error getting forum threads:', error);
      return [];
    }
  }

  async createForumThread(threadData: {
    title: string;
    content: string;
    category: string;
    tags?: string;
    created_by: number;
  }) {
    try {
      const res = await pool.query(
        `INSERT INTO forum_threads (title, content, category, tags, created_by)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [
          threadData.title,
          threadData.content,
          threadData.category,
          threadData.tags,
          threadData.created_by
        ]
      );
      return res.rows[0];
    } catch (error) {
      console.error('Error creating forum thread:', error);
      throw new Error('Failed to create forum thread');
    }
  }

  async getForumReplies(thread_id: number, limit?: number) {
    try {
      let query = `
        SELECT fr.*, u.name as author_name, u.avatar_url as author_avatar
        FROM forum_replies fr 
        LEFT JOIN users u ON fr.created_by = u.id
        WHERE fr.thread_id = $1
        ORDER BY fr.created_at DESC
      `;
      const params: any[] = [thread_id];

      if (limit) {
        query += ` LIMIT $2`;
        params.push(limit);
      }

      const res = await pool.query(query, params);
      return res.rows;
    } catch (error) {
      console.error('Error getting forum replies:', error);
      return [];
    }
  }

  async createForumReply(replyData: {
    thread_id: number;
    content: string;
    created_by: number;
  }) {
    try {
      const res = await pool.query(
        `INSERT INTO forum_replies (thread_id, content, created_by)
         VALUES ($1, $2, $3) RETURNING *`,
        [
          replyData.thread_id,
          replyData.content,
          replyData.created_by
        ]
      );
      return res.rows[0];
    } catch (error) {
      console.error('Error creating forum reply:', error);
      throw new Error('Failed to create forum reply');
    }
  }

  // Search operations
  async searchContent(query: string, type?: string, limit: number = 20) {
    try {
      const searchTerm = `%${query}%`;
      const results: any[] = [];

      if (!type || type === 'internships') {
        const res = await pool.query(
          `SELECT 'internship' as type, id, role as title, description, created_at
           FROM internships 
           WHERE is_active = true AND (role ILIKE $1 OR description ILIKE $1 OR domain ILIKE $1)
           ORDER BY created_at DESC
           LIMIT $2`,
          [searchTerm, limit]
        );
        results.push(...res.rows);
      }

      if (!type || type === 'events') {
        const res = await pool.query(
          `SELECT 'event' as type, id, title, description, created_at
           FROM events 
           WHERE is_active = true AND (title ILIKE $1 OR description ILIKE $1 OR event_type ILIKE $1)
           ORDER BY created_at DESC
           LIMIT $2`,
          [searchTerm, limit]
        );
        results.push(...res.rows);
      }

      if (!type || type === 'resources') {
        const res = await pool.query(
          `SELECT 'resource' as type, id, title, description, created_at
           FROM resources 
           WHERE title ILIKE $1 OR description ILIKE $1 OR category ILIKE $1
           ORDER BY created_at DESC
           LIMIT $2`,
          [searchTerm, limit]
        );
        results.push(...res.rows);
      }

      return results
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, limit);
    } catch (error) {
      console.error('Error searching content:', error);
      return [];
    }
  }

  // Secure OTP operations
  async storeSecureOtp(data: {
    userId?: number;
    contactInfo: string;
    channel: 'email' | 'sms';
    purpose: 'signup' | 'login' | 'reset';
    otpHash: string;
    salt: string;
    expiresAt: Date;
    ipAddress?: string;
    userAgent?: string;
  }) {
    try {
      // Clear any existing OTP for the same contact/purpose
      await pool.query(
        'DELETE FROM otp_storage WHERE contact_info = $1 AND channel = $2 AND purpose = $3',
        [data.contactInfo, data.channel, data.purpose]
      );

      // Insert new secure OTP
      const res = await pool.query(
        `INSERT INTO otp_storage (
          user_id, contact_info, channel, purpose, otp_hash, salt, 
          expires_at, ip_address, user_agent, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
        RETURNING id`,
        [
          data.userId || null,
          data.contactInfo,
          data.channel,
          data.purpose,
          data.otpHash,
          data.salt,
          data.expiresAt,
          data.ipAddress || null,
          data.userAgent || null
        ]
      );

      return res.rows[0];
    } catch (error) {
      console.error('Error storing secure OTP:', error);
      throw new Error('Failed to store OTP');
    }
  }

  async getOtpRecord(contactInfo: string, channel: 'email' | 'sms', purpose: 'signup' | 'login' | 'reset') {
    try {
      const res = await pool.query(
        `SELECT * FROM otp_storage 
         WHERE contact_info = $1 AND channel = $2 AND purpose = $3 
         AND expires_at > NOW()
         ORDER BY created_at DESC 
         LIMIT 1`,
        [contactInfo, channel, purpose]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error getting OTP record:', error);
      return null;
    }
  }

  async incrementOtpAttempts(otpId: number): Promise<{ attempts: number; shouldLock: boolean }> {
    try {
      const res = await pool.query(
        `UPDATE otp_storage 
         SET attempts = attempts + 1 
         WHERE id = $1 
         RETURNING attempts, max_attempts`,
        [otpId]
      );

      if (res.rows.length === 0) {
        throw new Error('OTP record not found');
      }

      const { attempts, max_attempts } = res.rows[0];
      const shouldLock = attempts >= max_attempts;

      if (shouldLock) {
        // Set lock timestamp
        const lockDuration = 15 * 60 * 1000; // 15 minutes
        const lockedUntil = new Date(Date.now() + lockDuration);
        
        await pool.query(
          'UPDATE otp_storage SET locked_until = $1 WHERE id = $2',
          [lockedUntil, otpId]
        );
      }

      return { attempts, shouldLock };
    } catch (error) {
      console.error('Error incrementing OTP attempts:', error);
      throw error;
    }
  }

  async isOtpLocked(otpId: number): Promise<boolean> {
    try {
      const res = await pool.query(
        'SELECT locked_until FROM otp_storage WHERE id = $1',
        [otpId]
      );

      if (res.rows.length === 0) {
        return false;
      }

      const lockedUntil = res.rows[0].locked_until;
      if (!lockedUntil) {
        return false;
      }

      return new Date() < new Date(lockedUntil);
    } catch (error) {
      console.error('Error checking OTP lock status:', error);
      return false;
    }
  }

  async clearOtpRecord(contactInfo: string, channel: 'email' | 'sms', purpose: 'signup' | 'login' | 'reset') {
    try {
      await pool.query(
        'DELETE FROM otp_storage WHERE contact_info = $1 AND channel = $2 AND purpose = $3',
        [contactInfo, channel, purpose]
      );
    } catch (error) {
      console.error('Error clearing OTP record:', error);
      // Don't throw error as this is cleanup
    }
  }

  async getDailyOtpCount(contactInfo: string, channel: 'email' | 'sms'): Promise<number> {
    try {
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM otp_storage 
         WHERE contact_info = $1 AND channel = $2 
         AND created_at > NOW() - INTERVAL '24 hours'`,
        [contactInfo, channel]
      );

      return parseInt(res.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting daily OTP count:', error);
      return 0;
    }
  }

  // Audit log operations
  async createAuditLog(data: {
    user_id?: number;
    action: string;
    channel?: string;
    purpose?: string;
    status: string;
    ip_address?: string;
    user_agent?: string;
    details?: string;
  }) {
    try {
      const res = await pool.query(
        `INSERT INTO audit_logs (
          user_id, action, channel, purpose, status, 
          ip_address, user_agent, details, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
        RETURNING id`,
        [
          data.user_id || null,
          data.action,
          data.channel || null,
          data.purpose || null,
          data.status,
          data.ip_address || null,
          data.user_agent || null,
          data.details || null
        ]
      );

      return res.rows[0];
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  }

  async getUserAuditLogs(userId: number, limit: number = 50, offset: number = 0, actions?: string[]) {
    try {
      let query = `
        SELECT * FROM audit_logs 
        WHERE user_id = $1
      `;
      const params: any[] = [userId];

      if (actions && actions.length > 0) {
        query += ` AND action = ANY($${params.length + 1})`;
        params.push(actions);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      params.push(limit, offset);

      const res = await pool.query(query, params);
      return res.rows;
    } catch (error) {
      console.error('Error getting user audit logs:', error);
      return [];
    }
  }

  async getAuditLogsByActions(actions: string[], hours: number = 24, limit: number = 100) {
    try {
      const res = await pool.query(
        `SELECT * FROM audit_logs 
         WHERE action = ANY($1) 
         AND timestamp > NOW() - INTERVAL '${hours} hours'
         ORDER BY timestamp DESC 
         LIMIT $2`,
        [actions, limit]
      );

      return res.rows;
    } catch (error) {
      console.error('Error getting audit logs by actions:', error);
      return [];
    }
  }

  // Rate limiting operations
  async getRateLimit(key: string) {
    try {
      const res = await pool.query(
        'SELECT * FROM rate_limits WHERE key = $1',
        [key]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error getting rate limit:', error);
      return null;
    }
  }

  async incrementRateLimit(key: string, windowStart: Date, expiresAt: Date) {
    try {
      await pool.query(
        `INSERT INTO rate_limits (key, requests, window_start, expires_at) 
         VALUES ($1, 1, $2, $3) 
         ON CONFLICT (key) 
         DO UPDATE SET 
           requests = rate_limits.requests + 1,
           window_start = CASE 
             WHEN rate_limits.expires_at < NOW() THEN $2 
             ELSE rate_limits.window_start 
           END,
           expires_at = CASE 
             WHEN rate_limits.expires_at < NOW() THEN $3 
             ELSE rate_limits.expires_at 
           END`,
        [key, windowStart, expiresAt]
      );
    } catch (error) {
      console.error('Error incrementing rate limit:', error);
      throw error;
    }
  }

  async deleteRateLimit(key: string) {
    try {
      await pool.query('DELETE FROM rate_limits WHERE key = $1', [key]);
    } catch (error) {
      console.error('Error deleting rate limit:', error);
      throw error;
    }
  }

  // Password reset operations
  async setPasswordResetToken(email: string, tokenHash: string, expiresAt: Date) {
    try {
      const res = await pool.query(
        `UPDATE users 
         SET reset_password_token = $1, reset_password_expires = $2, updated_at = NOW() 
         WHERE email = $3 
         RETURNING id, email, name`,
        [tokenHash, expiresAt, email]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error setting password reset token:', error);
      throw new Error('Failed to set password reset token');
    }
  }

  async getUserByResetToken(tokenHash: string) {
    try {
      const res = await pool.query(
        `SELECT id, email, name, reset_password_expires 
         FROM users 
         WHERE reset_password_token = $1 
         AND reset_password_expires > NOW()`,
        [tokenHash]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error getting user by reset token:', error);
      return null;
    }
  }

  async updatePasswordByResetToken(tokenHash: string, newPasswordHash: string) {
    try {
      const res = await pool.query(
        `UPDATE users 
         SET password_hash = $1, 
             reset_password_token = NULL, 
             reset_password_expires = NULL,
             last_password_reset = NOW(),
             updated_at = NOW()
         WHERE reset_password_token = $2 
         AND reset_password_expires > NOW()
         RETURNING id, email, name`,
        [newPasswordHash, tokenHash]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error updating password by reset token:', error);
      throw new Error('Failed to update password');
    }
  }

  async clearExpiredResetTokens() {
    try {
      const res = await pool.query(
        `UPDATE users 
         SET reset_password_token = NULL, reset_password_expires = NULL 
         WHERE reset_password_expires < NOW() 
         AND reset_password_token IS NOT NULL`
      );

      return res.rowCount || 0;
    } catch (error) {
      console.error('Error clearing expired reset tokens:', error);
      return 0;
    }
  }

  async getPasswordResetCount(email: string, hours: number = 24): Promise<number> {
    try {
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE details->>'email' = $1 
         AND action = 'password_reset_request'
         AND timestamp > NOW() - INTERVAL '${hours} hours'`,
        [email]
      );

      return parseInt(res.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting password reset count:', error);
      return 0;
    }
  }

  async getUserPasswordHistory(userId: number, limit: number = 5) {
    try {
      // This would require a password history table in a real implementation
      // For now, we'll just return the last reset timestamp
      const res = await pool.query(
        'SELECT last_password_reset FROM users WHERE id = $1',
        [userId]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error getting password history:', error);
      return null;
    }
  }

  // Two-Factor Authentication operations
  async enable2FA(userId: number, channel: 'email' | 'sms', phone?: string) {
    try {
      const updateData: any = {
        two_factor_enabled: true,
        two_factor_channel: channel,
        updated_at: 'NOW()'
      };

      // Update phone if SMS 2FA is enabled
      if (channel === 'sms' && phone) {
        updateData.phone = phone;
      }

      const fields = Object.keys(updateData);
      const values = Object.values(updateData);
      const setClause = fields.map((field, index) => 
        field === 'updated_at' ? `${field} = NOW()` : `${field} = $${index + 1}`
      ).join(', ');

      const res = await pool.query(
        `UPDATE users SET ${setClause} WHERE id = $${fields.length + 1} RETURNING id, email, name, two_factor_enabled, two_factor_channel`,
        [...values.filter(v => v !== 'NOW()'), userId]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error enabling 2FA:', error);
      throw new Error('Failed to enable 2FA');
    }
  }

  async disable2FA(userId: number) {
    try {
      const res = await pool.query(
        `UPDATE users 
         SET two_factor_enabled = false, 
             two_factor_channel = NULL,
             two_factor_backup_enabled = false,
             updated_at = NOW()
         WHERE id = $1 
         RETURNING id, email, name, two_factor_enabled`,
        [userId]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error disabling 2FA:', error);
      throw new Error('Failed to disable 2FA');
    }
  }

  async get2FASettings(userId: number) {
    try {
      const res = await pool.query(
        `SELECT id, email, name, phone, two_factor_enabled, two_factor_channel, 
                two_factor_backup_enabled, last_2fa_at
         FROM users 
         WHERE id = $1`,
        [userId]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error getting 2FA settings:', error);
      return null;
    }
  }

  async update2FASuccess(userId: number) {
    try {
      const res = await pool.query(
        `UPDATE users 
         SET last_2fa_at = NOW(), updated_at = NOW()
         WHERE id = $1 
         RETURNING last_2fa_at`,
        [userId]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error updating 2FA success timestamp:', error);
      return null;
    }
  }

  async getUserWith2FA(email: string) {
    try {
      const res = await pool.query(
        `SELECT id, email, name, phone, password_hash, is_verified,
                two_factor_enabled, two_factor_channel, two_factor_backup_enabled
         FROM users 
         WHERE email = $1`,
        [email]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error getting user with 2FA info:', error);
      return null;
    }
  }

  async get2FACount(userId: number, hours: number = 24): Promise<number> {
    try {
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE user_id = $1 
         AND action = 'otp_send'
         AND purpose = 'login'
         AND timestamp > NOW() - INTERVAL '${hours} hours'`,
        [userId]
      );

      return parseInt(res.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting 2FA count:', error);
      return 0;
    }
  }

  // Trusted Device operations
  async createTrustedDevice(userId: number, deviceId: string, deviceName: string | null, ipAddress: string, userAgent: string) {
    try {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const res = await pool.query(
        `INSERT INTO trusted_devices (user_id, device_id, device_name, ip_address, user_agent, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, device_id, device_name, created_at, expires_at`,
        [userId, deviceId, deviceName, ipAddress, userAgent, expiresAt]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error creating trusted device:', error);
      return null;
    }
  }

  async getTrustedDevice(deviceId: string) {
    try {
      const res = await pool.query(
        `SELECT td.*, u.email, u.name 
         FROM trusted_devices td
         JOIN users u ON td.user_id = u.id
         WHERE td.device_id = $1 
         AND td.is_active = true 
         AND td.expires_at > NOW()`,
        [deviceId]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error getting trusted device:', error);
      return null;
    }
  }

  async updateTrustedDeviceLastUsed(deviceId: string) {
    try {
      const res = await pool.query(
        `UPDATE trusted_devices 
         SET last_used_at = NOW() 
         WHERE device_id = $1 
         RETURNING last_used_at`,
        [deviceId]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error updating trusted device last used:', error);
      return null;
    }
  }

  async getUserTrustedDevices(userId: number) {
    try {
      const res = await pool.query(
        `SELECT device_id, device_name, ip_address, created_at, last_used_at, expires_at
         FROM trusted_devices 
         WHERE user_id = $1 
         AND is_active = true 
         AND expires_at > NOW()
         ORDER BY last_used_at DESC`,
        [userId]
      );

      return res.rows;
    } catch (error) {
      console.error('Error getting user trusted devices:', error);
      return [];
    }
  }

  async revokeTrustedDevice(userId: number, deviceId: string) {
    try {
      const res = await pool.query(
        `UPDATE trusted_devices 
         SET is_active = false 
         WHERE user_id = $1 AND device_id = $2 
         RETURNING device_id`,
        [userId, deviceId]
      );

      return res.rows[0] || null;
    } catch (error) {
      console.error('Error revoking trusted device:', error);
      return null;
    }
  }

  // Backup Codes operations
  async generateBackupCodes(userId: number, codes: string[]) {
    try {
      // First, invalidate any existing backup codes
      await pool.query('DELETE FROM backup_codes WHERE user_id = $1', [userId]);

      // Insert new backup codes (hashed)
      const crypto = require('crypto');
      const values = codes.map((code, index) => {
        const hash = crypto.createHash('sha256').update(code).digest('hex');
        return `($1, $${index + 2})`;
      }).join(', ');

      const params = [userId, ...codes.map(code => 
        crypto.createHash('sha256').update(code).digest('hex')
      )];

      const query = `INSERT INTO backup_codes (user_id, code_hash) VALUES ${values}`;
      
      await pool.query(query, params);
      return true;
    } catch (error) {
      console.error('Error generating backup codes:', error);
      return false;
    }
  }

  async verifyBackupCode(userId: number, code: string) {
    try {
      const crypto = require('crypto');
      const hash = crypto.createHash('sha256').update(code).digest('hex');

      const res = await pool.query(
        `SELECT id FROM backup_codes 
         WHERE user_id = $1 
         AND code_hash = $2 
         AND used = false`,
        [userId, hash]
      );

      if (res.rows.length === 0) {
        return { valid: false, codeId: null };
      }

      const codeId = res.rows[0].id;
      
      // Mark code as used
      await pool.query(
        `UPDATE backup_codes 
         SET used = true, used_at = NOW() 
         WHERE id = $1`,
        [codeId]
      );

      return { valid: true, codeId };
    } catch (error) {
      console.error('Error verifying backup code:', error);
      return { valid: false, codeId: null };
    }
  }

  async getUnusedBackupCodeCount(userId: number): Promise<number> {
    try {
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM backup_codes 
         WHERE user_id = $1 AND used = false`,
        [userId]
      );

      return parseInt(res.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting unused backup code count:', error);
      return 0;
    }
  }

  // Admin Statistics
  async getOtpStats(hours: number = 24) {
    try {
      const res = await pool.query(
        `SELECT 
           COUNT(*) FILTER (WHERE action = 'otp_send') as total_requests,
           COUNT(*) FILTER (WHERE action = 'otp_verify_fail') as failed_attempts,
           COUNT(*) FILTER (WHERE action = 'otp_locked') as lockouts_triggered,
           COUNT(*) FILTER (WHERE action = 'otp_send' AND channel = 'email') as email_sends,
           COUNT(*) FILTER (WHERE action = 'otp_send' AND channel = 'sms') as sms_sends
         FROM audit_logs 
         WHERE timestamp > NOW() - INTERVAL '${hours} hours'
         AND action IN ('otp_send', 'otp_verify_fail', 'otp_locked')`
      );

      return res.rows[0] || {};
    } catch (error) {
      console.error('Error getting OTP stats:', error);
      return {};
    }
  }

  async get2FAStats() {
    try {
      const res = await pool.query(
        `SELECT 
           COUNT(*) as total_users,
           COUNT(*) FILTER (WHERE two_factor_enabled = true) as users_with_2fa,
           COUNT(*) FILTER (WHERE two_factor_enabled = true AND two_factor_channel = 'email') as email_2fa_users,
           COUNT(*) FILTER (WHERE two_factor_enabled = true AND two_factor_channel = 'sms') as sms_2fa_users
         FROM users`
      );

      return res.rows[0] || {};
    } catch (error) {
      console.error('Error getting 2FA stats:', error);
      return {};
    }
  }

  async getSuspiciousActivity(userId: number, minutes: number = 10): Promise<number> {
    try {
      const res = await pool.query(
        `SELECT COUNT(*) as count FROM audit_logs 
         WHERE user_id = $1 
         AND action IN ('otp_verify_fail', 'user_login_fail')
         AND timestamp > NOW() - INTERVAL '${minutes} minutes'`,
        [userId]
      );

      return parseInt(res.rows[0].count) || 0;
    } catch (error) {
      console.error('Error getting suspicious activity:', error);
      return 0;
    }
  }

  async cleanupExpiredRecords() {
    try {
      const now = new Date();
      
      // Cleanup expired OTP records
      await pool.query('DELETE FROM otp_storage WHERE expires_at < $1', [now]);
      
      // Cleanup expired rate limits
      await pool.query('DELETE FROM rate_limits WHERE expires_at < $1', [now]);
      
      // Cleanup expired password reset tokens
      const expiredTokens = await this.clearExpiredResetTokens();
      
      // Cleanup old audit logs (keep 90 days)
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      await pool.query('DELETE FROM audit_logs WHERE timestamp < $1', [ninetyDaysAgo]);
      
      console.log(`✅ Cleanup completed: ${expiredTokens} expired reset tokens cleared`);
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}

export const storage = new PostgreSQLStorage();

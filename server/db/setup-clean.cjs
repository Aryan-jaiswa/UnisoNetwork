#!/usr/bin/env node

/**
 * Direct Database Setup Script for UNiSO Network
 * This will cleanly setup the database by dropping and recreating all tables
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function setupDatabase() {
  console.log('🚀 Setting up UNiSO Network database...\n');

  try {
    // Test connection
    console.log('1. Testing database connection...');
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    // Drop existing tables
    console.log('2. Cleaning existing tables...');
    await pool.query(`
      DROP TABLE IF EXISTS forum_posts CASCADE;
      DROP TABLE IF EXISTS forums CASCADE;
      DROP TABLE IF EXISTS group_members CASCADE;
      DROP TABLE IF EXISTS groups CASCADE;
      DROP TABLE IF EXISTS resources CASCADE;
      DROP TABLE IF EXISTS events CASCADE;
      DROP TABLE IF EXISTS internships CASCADE;
      DROP TABLE IF EXISTS companies CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
    `);
    console.log('✅ Existing tables cleaned!\n');

    // Create users table
    console.log('3. Creating users table...');
    await pool.query(`
      CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          email VARCHAR(150) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          avatar_url TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create companies table
    console.log('4. Creating companies table...');
    await pool.query(`
      CREATE TABLE companies (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          logo_url TEXT,
          website TEXT,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create internships table
    console.log('5. Creating internships table...');
    await pool.query(`
      CREATE TABLE internships (
          id SERIAL PRIMARY KEY,
          role VARCHAR(100) NOT NULL,
          company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
          location VARCHAR(100),
          type VARCHAR(50),
          domain VARCHAR(50),
          description TEXT,
          requirements TEXT,
          salary_range VARCHAR(100),
          apply_link TEXT,
          posted_date DATE,
          deadline DATE,
          logo TEXT,
          company_color VARCHAR(50),
          is_active BOOLEAN DEFAULT TRUE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create forums table
    console.log('6. Creating forums table...');
    await pool.query(`
      CREATE TABLE forums (
          id SERIAL PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create forum_posts table
    console.log('7. Creating forum_posts table...');
    await pool.query(`
      CREATE TABLE forum_posts (
          id SERIAL PRIMARY KEY,
          forum_id INTEGER REFERENCES forums(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          content TEXT NOT NULL,
          upvotes INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create groups table
    console.log('8. Creating groups table...');
    await pool.query(`
      CREATE TABLE groups (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          category VARCHAR(50),
          privacy VARCHAR(20) DEFAULT 'public',
          max_members INTEGER,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create group_members table
    console.log('9. Creating group_members table...');
    await pool.query(`
      CREATE TABLE group_members (
          id SERIAL PRIMARY KEY,
          group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          role VARCHAR(20) DEFAULT 'member',
          joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create events table
    console.log('10. Creating events table...');
    await pool.query(`
      CREATE TABLE events (
          id SERIAL PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          description TEXT,
          location VARCHAR(100),
          event_date TIMESTAMP,
          event_type VARCHAR(50),
          organizer VARCHAR(100),
          registration_link TEXT,
          max_participants INTEGER,
          is_active BOOLEAN DEFAULT TRUE,
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create resources table
    console.log('11. Creating resources table...');
    await pool.query(`
      CREATE TABLE resources (
          id SERIAL PRIMARY KEY,
          title VARCHAR(200) NOT NULL,
          resource_url TEXT NOT NULL,
          description TEXT,
          resource_type VARCHAR(50),
          category VARCHAR(50),
          tags TEXT,
          upvotes INTEGER DEFAULT 0,
          posted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    console.log('12. Creating indexes...');
    await pool.query(`
      CREATE INDEX idx_users_email ON users(email);
      CREATE INDEX idx_internships_company_id ON internships(company_id);
      CREATE INDEX idx_internships_type ON internships(type);
      CREATE INDEX idx_internships_domain ON internships(domain);
      CREATE INDEX idx_events_event_date ON events(event_date);
      CREATE INDEX idx_forum_posts_forum_id ON forum_posts(forum_id);
      CREATE INDEX idx_group_members_group_id ON group_members(group_id);
      CREATE INDEX idx_resources_category ON resources(category);
    `);

    // Insert default forum
    console.log('13. Creating default forum...');
    await pool.query(`
      INSERT INTO forums (title, description) VALUES 
      ('General Discussion', 'General discussions and real talks');
    `);

    // Insert sample companies
    console.log('14. Inserting sample companies...');
    await pool.query(`
      INSERT INTO companies (name, logo_url, website, description) VALUES
      ('Google', '/logos/google.png', 'https://google.com', 'Technology giant focusing on search, cloud, and AI'),
      ('Microsoft', '/logos/microsoft.png', 'https://microsoft.com', 'Software, cloud services, and productivity tools'),
      ('Meta', '/logos/meta.png', 'https://meta.com', 'Social technology company building the metaverse'),
      ('Netflix', '/logos/netflix.png', 'https://netflix.com', 'Entertainment streaming and content platform'),
      ('Amazon', '/logos/amazon.png', 'https://amazon.com', 'E-commerce, cloud computing, and digital services'),
      ('Apple', '/logos/apple.png', 'https://apple.com', 'Consumer electronics, software, and services');
    `);

    // Final verification
    console.log('15. Verifying setup...');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const companyCount = await pool.query('SELECT COUNT(*) FROM companies');
    const forumCount = await pool.query('SELECT COUNT(*) FROM forums');
    
    console.log('✅ Database setup completed successfully!\n');
    console.log(`📊 Database summary:`);
    console.log(`   - Users: ${userCount.rows[0].count}`);
    console.log(`   - Companies: ${companyCount.rows[0].count}`);
    console.log(`   - Forums: ${forumCount.rows[0].count}`);
    console.log(`   - All tables created with proper relationships\n`);

    console.log('📝 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Open http://localhost:5000 in your browser');
    console.log('   3. Register a new account to get started');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();

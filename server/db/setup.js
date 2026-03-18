#!/usr/bin/env node

/**
 * Da    // Read and execute schema
    console.log('2. Creating database schema...');
    const schemaPath = path.join(__dirname, 'clean-setup.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('✅ Database schema created successfully!\n');Setup Script for UNiSO Network
 * Run this to initialize your PostgreSQL database
 */

import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

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

    // Read and execute schema
    console.log('2. Creating database schema...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    await pool.query(schema);
    console.log('✅ Database schema created successfully!\n');

    // Check data
    console.log('3. Checking database tables...');
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const companyCount = await pool.query('SELECT COUNT(*) FROM companies');
    
    console.log(`📊 Current data: ${userCount.rows[0].count} users, ${companyCount.rows[0].count} companies`);

    console.log('🎉 Database setup completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Open http://localhost:5000 in your browser');
    console.log('   3. Register a new account to get started');

  } catch (error) {
    console.error('❌ Database setup failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();

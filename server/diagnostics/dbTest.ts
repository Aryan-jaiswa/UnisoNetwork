import dotenv from 'dotenv';
import { Pool } from 'pg';

dotenv.config({ path: '../../.env' });

async function testDatabase() {
  console.log('🔍 Testing Database Connection...');
  
  try {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    const result = await pool.query('SELECT NOW();');
    console.log('✅ Database connection successful!');
    console.log(`🕒 Server time: ${result.rows[0].now}`);
    await pool.end();
    return true;
  } catch (error: any) {
    console.log('❌ Database connection failed!');
    console.error(error.message);
    return false;
  }
}

if (require.main === module) {
  testDatabase();
}

export default testDatabase;

const pool = require('./index').default;
const fs = require('fs');
const path = require('path');

async function migrate() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');
  try {
    await pool.query(schema);
    console.log('Database migrated successfully.');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await pool.end();
  }
}

migrate();

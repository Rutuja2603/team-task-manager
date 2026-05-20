const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const initDB = async () => {
  // create tables
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'member',
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS projects (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      description TEXT,
      owner_id INT REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS project_members (
      project_id INT REFERENCES projects(id) ON DELETE CASCADE,
      user_id INT REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id SERIAL PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      status VARCHAR(20) DEFAULT 'pending',
      priority VARCHAR(20) DEFAULT 'medium',
      due_date DATE,
      project_id INT REFERENCES projects(id) ON DELETE CASCADE,
      assigned_to INT REFERENCES users(id) ON DELETE SET NULL,
      created_by INT REFERENCES users(id),
      created_at TIMESTAMP DEFAULT NOW()
    );
  `);

  // seed fixed admin account if not already exists
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@taskflow.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const adminName = process.env.ADMIN_NAME || 'Admin';

  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
  if (existing.rows.length === 0) {
    const hashed = await bcrypt.hash(adminPassword, 10);
    await pool.query(
      'INSERT INTO users (name, email, password, role) VALUES ($1, $2, $3, $4)',
      [adminName, adminEmail, hashed, 'admin']
    );
    console.log(`✅ Admin account created: ${adminEmail} / ${adminPassword}`);
  } else {
    console.log(`✅ Admin account already exists: ${adminEmail}`);
  }

  console.log('✅ Database ready');
};

module.exports = { pool, initDB };
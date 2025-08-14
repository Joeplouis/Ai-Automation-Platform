#!/usr/bin/env node

import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function createAdmin() {
  try {
    const email = 'joeplouis68@gmail.com';
    const password = 'Kiarah@0320!';
    const role = 'super_admin';
    
    // Hash the password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Delete existing admin user if exists
    await pool.query('DELETE FROM admin_users WHERE email = $1', [email]);
    
    // Create new admin user
    const query = `
      INSERT INTO admin_users (email, password_hash, role)
      VALUES ($1, $2, $3)
      RETURNING id, email, role, created_at
    `;
    
    const result = await pool.query(query, [email, passwordHash, role]);
    
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 Role:', role);
    console.log('🆔 User ID:', result.rows[0].id);
    console.log('📅 Created:', result.rows[0].created_at);
    
    // Test the login
    const isValid = await bcrypt.compare(password, passwordHash);
    console.log('🧪 Password verification test:', isValid ? '✅ PASSED' : '❌ FAILED');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
  } finally {
    await pool.end();
  }
}

createAdmin();

#!/usr/bin/env node
import { readdirSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';
import { loadConfig } from '../src/core/config.js';

const cfg = loadConfig();
const pool = new Pool({ connectionString: cfg.databaseUrl, ssl: cfg.nodeEnv === 'production' ? { rejectUnauthorized: false } : false });

async function ensureTable() {
  await pool.query(`CREATE TABLE IF NOT EXISTS schema_migrations (id serial primary key, filename text not null unique, applied_at timestamptz not null default now())`);
}

async function applied() {
  const { rows } = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(rows.map(r => r.filename));
}

async function run() {
  await ensureTable();
  const done = await applied();
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const dir = path.join(__dirname, '..', 'migrations');
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
    if (done.has(f)) continue;
    const sql = readFileSync(path.join(dir, f), 'utf8');
    console.log(`Applying migration ${f}`);
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [f]);
      await pool.query('COMMIT');
    } catch (e) {
      await pool.query('ROLLBACK');
      console.error('Migration failed:', f, e);
      process.exit(1);
    }
  }
  console.log('All migrations up to date');
  await pool.end();
}

run();

// In-memory Postgres test harness using pg-mem to satisfy pool queries without real DB.
import { newDb } from 'pg-mem';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

let started = false;
let originalEnv = {};

export async function setupTestDb() {
  if (started) return;
  const db = newDb({ autoCreateForeignKeyIndices: true });
  // Register crypto/random functions used by schema (gen_random_uuid). Use node crypto v4.
  db.public.registerFunction({ name: 'gen_random_uuid', returns: 'uuid', implementation: () => randomUUID() });
  // Register plpgsql language stub for trigger function creation in migrations
  try { db.registerLanguage('plpgsql', () => ({
    createFunction: (fn) => fn, // no-op stub
  })); } catch (e) { /* ignore if already */ }
  // Apply migrations
  const migDir = path.join(process.cwd(), 'migrations');
  const files = fs.readdirSync(migDir).filter(f => f.endsWith('.sql')).sort();
  for (const f of files) {
  let sql = fs.readFileSync(path.join(migDir, f), 'utf8');
  // In in-memory test mode strip trigger function & trigger creation blocks (pg-mem lacks full trigger support)
  sql = sql.replace(/CREATE OR REPLACE FUNCTION set_updated_at[\s\S]*?LANGUAGE plpgsql;?/gi, '');
  sql = sql.replace(/DO \$\$[\s\S]*?END \$\$;?/gi, (block) => block.includes('trg_') ? '' : block);
  try {
    db.public.none(sql);
  } catch (e) {
    // For pg-mem coverage complaints on duplicated objects, log once and continue
    if (!/pg-mem/.test(e.message)) throw e;
    // eslint-disable-next-line no-console
    console.warn('pg-mem partial feature limitation encountered while applying', f, '-', e.message.split('\n')[0]);
  }
  }
  // Expose pg compatible adapter
  const pgMem = db.adapters.createPg();
  // Expose adapter globally for jest pg mock
  global.__pgmem = pgMem;
  originalEnv = { ...process.env };
  process.env.DATABASE_URL = 'mem://testdb';
  process.env.JWT_ISSUER = process.env.JWT_ISSUER || 'test-issuer';
  process.env.JWT_AUDIENCE = process.env.JWT_AUDIENCE || 'test-audience';
  process.env.JWT_PRIVATE_KEY = process.env.JWT_PRIVATE_KEY || 'test-key';
  process.env.JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || 'test-pub';
  started = true;
}

export function teardownTestDb() {
  process.env = { ...originalEnv };
}

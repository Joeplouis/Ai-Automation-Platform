import { Pool } from 'pg';
import { createN8NManager } from '../src/modules/n8n/manager.js';

describe('n8n manager', () => {
  let pool; let mgr; let created;
  beforeAll(() => {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb'; // placeholder; test will skip if unreachable
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
    mgr = createN8NManager(pool);
  });
  afterAll(async () => { await pool.end(); });

  test('create + list', async () => {
    try {
      created = await mgr.createInstance({ name: 'test-n8n', base_url: 'http://localhost:5678' });
      expect(created).toHaveProperty('id');
      const list = await mgr.listInstances();
      expect(Array.isArray(list)).toBe(true);
    } catch (e) {
      if (e.message.includes('connect') || e.message.includes('ECONNREFUSED')) {
        console.warn('Skipping n8n manager test (DB not reachable)');
        return;
      }
      throw e;
    }
  });
});

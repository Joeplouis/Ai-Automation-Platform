import { Pool } from 'pg';
import { createWordPressManager } from '../src/modules/wordpress/manager.js';

describe('wordpress manager', () => {
  let pool; let mgr; let created;
  beforeAll(() => {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
    mgr = createWordPressManager(pool);
  });
  afterAll(async () => { await pool.end(); });

  test('create + list + credentials', async () => {
    try {
      created = await mgr.createSite({ domain: 'example.com', url: 'https://example.com' });
      expect(created).toHaveProperty('id');
      const site = await mgr.getSite(created.id);
      expect(site.domain).toBe('example.com');
      await mgr.setAdminCredentials(created.id, { admin_user: 'admin', admin_pass: 'secret123' });
      const list = await mgr.listSites();
      expect(Array.isArray(list)).toBe(true);
    } catch (e) {
      if (e.message.includes('connect') || e.message.includes('ECONNREFUSED')) {
        console.warn('Skipping wordpress manager test (DB not reachable)');
        return;
      }
      throw e;
    }
  });
});

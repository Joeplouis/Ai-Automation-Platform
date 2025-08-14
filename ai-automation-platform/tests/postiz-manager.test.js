import { Pool } from 'pg';
import { createPostizManager } from '../src/modules/postiz/manager.js';

describe('postiz manager', () => {
  let pool; let mgr; let created;
  beforeAll(() => {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
    mgr = createPostizManager(pool);
  });
  afterAll(async () => { await pool.end(); });

  test('create + rotate tokens', async () => {
    try {
      created = await mgr.createAccount({ platform: 'twitter', username: 'acct1', display_name: 'Acct One', access_token: 'a1', refresh_token: 'r1' });
      expect(created).toHaveProperty('id');
      await mgr.rotateTokens(created.id, { access_token: 'a2' });
      const list = await mgr.listAccounts({ platform: 'twitter' });
      expect(list.length).toBeGreaterThan(0);
    } catch (e) {
      if (e.message.includes('connect') || e.message.includes('ECONNREFUSED')) {
        console.warn('Skipping postiz manager test (DB not reachable)');
        return;
      }
      throw e;
    }
  });
});

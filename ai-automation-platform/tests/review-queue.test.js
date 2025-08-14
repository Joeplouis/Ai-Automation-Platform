import { Pool } from 'pg';
import { createReviewQueueManager } from '../src/modules/reviews/manager.js';
import { REVIEW_STATUS } from '../src/core/review-status.js';

// These tests are best-effort; they skip if DB not reachable.

describe('review queue manager', () => {
  let pool; let mgr; let created;
  beforeAll(() => {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb'; // placeholder
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
    mgr = createReviewQueueManager(pool);
  });
  afterAll(async () => { await pool.end(); });

  test('create + list pending', async () => {
    try {
      // Need an ai_outputs row to satisfy FK
      const { rows: aiRows } = await pool.query("INSERT INTO ai_outputs (prompt, model, output) VALUES ('p','m', '{}'::jsonb) RETURNING id");
      created = await mgr.createReview({ ai_output_id: aiRows[0].id });
      expect(created.status).toBe(REVIEW_STATUS.PENDING);
      const pending = await mgr.listPending();
      expect(Array.isArray(pending)).toBe(true);
    } catch (e) {
      if (e.message.includes('connect') || e.message.includes('ECONNREFUSED')) {
        console.warn('Skipping review queue test (DB not reachable)');
        return;
      }
      throw e;
    }
  });

  test('approve transition', async () => {
    if (!created) return; // prior test skipped
    try {
      const approved = await mgr.approve({ id: created.id, reviewer_id: '00000000-0000-0000-0000-000000000001', notes: 'ok' });
      expect(approved.status).toBe(REVIEW_STATUS.APPROVED);
    } catch (e) {
      if (e.message.includes('connect') || e.message.includes('ECONNREFUSED')) return;
      throw e;
    }
  });
});

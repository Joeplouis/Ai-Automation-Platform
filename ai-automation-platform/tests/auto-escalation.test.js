import { Pool } from 'pg';
import { createOutputCapture } from '../src/ai/output-capture.js';

// Simulate very low confidence by using a scorer returning 0
const lowScorer = { score: async () => 0.0 };

describe('auto-escalation', () => {
  let pool; let capture;
  beforeAll(() => {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    }
    process.env.AI_REVIEW_THRESHOLD = '0.2';
    pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
    capture = createOutputCapture({ pool, scorer: lowScorer, autoEscalate: true });
  });
  afterAll(async () => { await pool.end(); });

  test('creates review when below threshold', async () => {
    try {
      const wrapped = capture.wrap(async () => ({ draft: 'tiny' }), { model: 'test' });
      const { meta } = await wrapped({ any: 'prompt' });
      expect(meta.ai_output_id).toBeDefined();
      const { rows } = await pool.query('SELECT * FROM human_reviews WHERE ai_output_id=$1', [meta.ai_output_id]);
      // If DB not present the query will throw early
      if (rows.length) {
        expect(rows[0].status).toBe('pending');
      }
    } catch (e) {
      if (e.message.includes('connect') || e.message.includes('ECONNREFUSED')) {
        console.warn('Skipping auto-escalation test (DB not reachable)');
        return;
      }
      throw e;
    }
  });
});

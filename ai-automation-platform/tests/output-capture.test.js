import { Pool } from 'pg';
import { createOutputCapture } from '../src/ai/output-capture.js';

describe('output capture', () => {
  let pool; let capture;
  beforeAll(() => {
    if (!process.env.DATABASE_URL && !process.env.POSTGRES_URL) {
      process.env.DATABASE_URL = 'postgres://user:pass@localhost:5432/testdb';
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL });
    capture = createOutputCapture({ pool });
  });
  afterAll(async () => { await pool.end(); });

  test('wrap + record', async () => {
    try {
      const fn = async ({ topic }) => ({ topic, text: 'hello' });
      const wrapped = capture.wrap(fn, { model: 'test-model' });
      const { output, meta } = await wrapped({ topic: 'world' });
      expect(output.topic).toBe('world');
      expect(meta.ai_output_id).toBeDefined();
    } catch (e) {
      if (e.message.includes('connect') || e.message.includes('ECONNREFUSED')) {
        console.warn('Skipping output capture test (DB not reachable)');
        return;
      }
      throw e;
    }
  });
});

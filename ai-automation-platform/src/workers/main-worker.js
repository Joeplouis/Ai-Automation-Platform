import 'dotenv/config';
import { Pool } from 'pg';
import { createClient as createRedis } from 'redis';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let redis = null;
if (process.env.REDIS_URL) {
  try {
    redis = createRedis({ url: process.env.REDIS_URL });
    await redis.connect();
    console.log('[worker] Redis connected');
  } catch (e) {
    console.warn('[worker] Redis disabled:', e.message);
  }
}

let shuttingDown = false;
async function loop() {
  if (shuttingDown) return;
  try {
    console.log('[worker] heartbeat');
  } catch (e) {
    console.error('[worker] error', e);
  } finally {
    setTimeout(loop, 5000);
  }
}
loop();

process.on('SIGTERM', async () => {
  shuttingDown = true;
  if (redis) await redis.quit();
  await pool.end();
  process.exit(0);
});

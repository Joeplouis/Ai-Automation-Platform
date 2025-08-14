import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Pool } from 'pg';
import { createClient as createRedis } from 'redis';
import enterpriseRouter, { initializeEnterpriseAPI } from '../enterprise/billion-dollar-api.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors());
app.use(helmet());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let redis = null;
if (process.env.REDIS_URL) {
  try {
    redis = createRedis({ url: process.env.REDIS_URL });
    await redis.connect();
    console.log('[analytics] Redis connected');
  } catch (e) {
    console.warn('[analytics] Redis disabled:', e.message);
  }
}

app.use((req, _res, next) => { req.pool = pool; req.redis = redis; next(); });
initializeEnterpriseAPI(pool, redis);
app.use('/api/enterprise', enterpriseRouter);
app.get('/health', (_req, res) => res.json({ ok: true, service: 'analytics', ts: new Date().toISOString() }));
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.path }));
app.use((err, _req, res, _next) => { console.error('[analytics] error', err); res.status(500).json({ error: 'Internal Server Error' }); });

const port = process.env.PORT || process.env.ANALYTICS_PORT || 8003;
app.listen(port, () => console.log(`Analytics server listening on ${port}`));

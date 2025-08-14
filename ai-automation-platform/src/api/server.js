import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Pool } from 'pg';
import { createClient as createRedis } from 'redis';
import { initializeLLMRoutes } from './llm-routes.js';
import { initializeReviewRoutes } from './review-routes.js';
import { makeRateLimiter } from '../utils/rateLimit.js';
import { metricsMiddleware, renderMetrics, initMetrics } from '../observability/metrics.js';

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(metricsMiddleware());
initMetrics();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

let redis = null;
if (process.env.REDIS_URL) {
  try {
    redis = createRedis({ url: process.env.REDIS_URL });
    await redis.connect();
    console.log('[api] Redis connected');
  } catch (e) {
    console.warn('[api] Redis disabled:', e.message);
  }
}

app.use((req, _res, next) => { req.pool = pool; req.redis = redis; next(); });

try {
  const rl = await makeRateLimiter(pool, redis);
  app.use(rl);
} catch (e) {
  console.warn('[api] Rate limiter init failed:', e.message);
}

const llmRouter = initializeLLMRoutes(pool, redis);
app.use('/api/llm', llmRouter);
const reviewRouter = initializeReviewRoutes(pool);
app.use('/api/reviews', reviewRouter);

app.get('/health', (_req, res) => res.json({ ok: true, service: 'api', ts: new Date().toISOString() }));
app.get('/metrics', async (_req, res) => {
  try {
    const data = await renderMetrics();
    res.set('Content-Type', 'text/plain');
    res.send(data);
  } catch (e) {
    res.status(500).json({ error: 'metrics_unavailable' });
  }
});
app.use((req, res) => res.status(404).json({ error: 'Not Found', path: req.path }));
app.use((err, _req, res) => { console.error('[api] error', err); res.status(500).json({ error: 'Internal Server Error' }); });

const port = process.env.PORT || process.env.API_PORT || 8001;
app.listen(port, () => console.log(`API server listening on ${port}`));

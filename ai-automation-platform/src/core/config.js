// Central configuration loading & validation
import 'dotenv/config';

const required = [
  'JWT_SECRET',
  'ADMIN_KMS_KEY',
  // Hardening additions
  'JWT_ISSUER',
  'JWT_AUDIENCE'
];

export function loadConfig(overrides = {}) {
  const cfg = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '8080', 10),
    databaseUrl: process.env.DATABASE_URL || process.env.POSTGRES_URL,
    redisUrl: process.env.REDIS_URL || (process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT || 6379}` : null),
    jwtSecret: process.env.JWT_SECRET,
    adminKmsKey: process.env.ADMIN_KMS_KEY,
    openrouterKey: process.env.OPENROUTER_API_KEY || null,
    ollamaBase: process.env.OLLAMA_BASE_URL || null,
    ...overrides
  };

  const missing = required.filter(k => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  if (!cfg.databaseUrl) {
    throw new Error('DATABASE_URL or POSTGRES_URL required');
  }
  return cfg;
}

export function assertConfig() {
  loadConfig();
}

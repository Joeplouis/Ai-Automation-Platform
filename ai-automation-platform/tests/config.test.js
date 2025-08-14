import { loadConfig } from '../src/core/config.js';

describe('config loader', () => {
  test('throws without required env', () => {
    const old = { ...process.env };
    delete process.env.JWT_SECRET;
    delete process.env.ADMIN_KMS_KEY;
    expect(() => loadConfig()).toThrow(/Missing required environment variables/);
    process.env.JWT_SECRET = 'x';
    process.env.ADMIN_KMS_KEY = 'y';
    process.env.DATABASE_URL = 'postgres://u:p@localhost:5432/db';
    expect(() => loadConfig()).not.toThrow();
    Object.assign(process.env, old);
  });
});

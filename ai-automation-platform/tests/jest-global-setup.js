import { setupTestDb } from './test-db-setup.js';

beforeAll(async () => {
  await setupTestDb();
});

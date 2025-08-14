import { encryptSecret, decryptSecret } from '../src/core/crypto.js';

describe('crypto', () => {
  test('roundtrip', () => {
    const secret = 'super-secret';
    const key = 'master-key-123';
    const { ciphertext, iv, tag } = encryptSecret(secret, key);
    const plain = decryptSecret(ciphertext, iv, tag, key);
    expect(plain).toBe(secret);
  });
});

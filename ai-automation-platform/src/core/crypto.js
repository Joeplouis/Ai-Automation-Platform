import crypto from 'crypto';

function deriveKey(secret) {
  if (!secret) throw new Error('Missing encryption key');
  if (secret.length === 64 && /^[0-9a-fA-F]+$/.test(secret)) return Buffer.from(secret, 'hex');
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain, master) {
  const key = deriveKey(master);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { ciphertext: ciphertext.toString('base64'), iv: iv.toString('base64'), tag: tag.toString('base64') };
}

export function decryptSecret(ct, ivB, tagB, master) {
  const key = deriveKey(master);
  const iv = Buffer.from(ivB, 'base64');
  const tag = Buffer.from(tagB, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const out = Buffer.concat([decipher.update(Buffer.from(ct, 'base64')), decipher.final()]);
  return out.toString('utf8');
}

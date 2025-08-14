// Crypto utilities for encrypting/decrypting API keys
// Uses AES-256-GCM for authenticated encryption

import { createCipher, createDecipher, randomBytes, createHash } from 'crypto';

/**
 * Encrypt a secret using AES-256-GCM
 * @param {string} plaintext - The secret to encrypt
 * @param {string} masterKey - The master encryption key
 * @returns {object} - Object containing ciphertext, iv, and tag
 */
export function encryptSecret(plaintext, masterKey) {
  if (!plaintext || !masterKey) {
    throw new Error('Both plaintext and masterKey are required');
  }
  
  try {
    // Generate a random initialization vector
    const iv = randomBytes(16);
    
    // Create a hash of the master key to ensure consistent length
    const key = createHash('sha256').update(masterKey).digest();
    
    // Create cipher
    const cipher = createCipher('aes-256-gcm', key);
    cipher.setAAD(Buffer.from('ai-gateway-v1'));
    
    // Encrypt the plaintext
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    // Get the authentication tag
    const tag = cipher.getAuthTag();
    
    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Decrypt a secret using AES-256-GCM
 * @param {string} ciphertext - The encrypted data
 * @param {string} iv - The initialization vector (hex string)
 * @param {string} tag - The authentication tag (hex string)
 * @param {string} masterKey - The master encryption key
 * @returns {string} - The decrypted plaintext
 */
export function decryptSecret(ciphertext, iv, tag, masterKey) {
  if (!ciphertext || !iv || !tag || !masterKey) {
    throw new Error('All parameters (ciphertext, iv, tag, masterKey) are required');
  }
  
  try {
    // Create a hash of the master key to ensure consistent length
    const key = createHash('sha256').update(masterKey).digest();
    
    // Create decipher
    const decipher = createDecipher('aes-256-gcm', key);
    decipher.setAAD(Buffer.from('ai-gateway-v1'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    // Decrypt the ciphertext
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

/**
 * Generate a secure random key for use as master key
 * @param {number} length - Length in bytes (default: 32 for 256-bit key)
 * @returns {string} - Hex-encoded random key
 */
export function generateMasterKey(length = 32) {
  return randomBytes(length).toString('hex');
}

/**
 * Validate that a master key is properly formatted
 * @param {string} key - The key to validate
 * @returns {boolean} - True if valid
 */
export function validateMasterKey(key) {
  if (!key || typeof key !== 'string') {
    return false;
  }
  
  // Should be at least 32 characters (128-bit minimum)
  if (key.length < 32) {
    return false;
  }
  
  // Should contain only valid characters
  if (!/^[a-fA-F0-9]+$/.test(key) && !/^[a-zA-Z0-9+/=]+$/.test(key)) {
    // Allow hex or base64 encoded keys
    return false;
  }
  
  return true;
}

// Alternative implementation using Node.js built-in crypto with proper GCM mode
import { createCipherGCM, createDecipherGCM } from 'crypto';

/**
 * Modern encrypt function using proper GCM mode
 * @param {string} plaintext - The secret to encrypt
 * @param {string} masterKey - The master encryption key
 * @returns {object} - Object containing ciphertext, iv, and tag
 */
export function encryptSecretGCM(plaintext, masterKey) {
  if (!plaintext || !masterKey) {
    throw new Error('Both plaintext and masterKey are required');
  }
  
  try {
    // Generate a random initialization vector
    const iv = randomBytes(16);
    
    // Create a hash of the master key to ensure consistent length
    const key = createHash('sha256').update(masterKey).digest();
    
    // Create cipher with proper GCM mode
    const cipher = createCipherGCM('aes-256-gcm');
    cipher.setKey(key);
    cipher.setIV(iv);
    
    // Optional: Add additional authenticated data
    const aad = Buffer.from('ai-gateway-provider-key');
    cipher.setAAD(aad);
    
    // Encrypt the plaintext
    let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
    ciphertext += cipher.final('hex');
    
    // Get the authentication tag
    const tag = cipher.getAuthTag();
    
    return {
      ciphertext,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  } catch (error) {
    throw new Error(`Encryption failed: ${error.message}`);
  }
}

/**
 * Modern decrypt function using proper GCM mode
 * @param {string} ciphertext - The encrypted data
 * @param {string} iv - The initialization vector (hex string)
 * @param {string} tag - The authentication tag (hex string)
 * @param {string} masterKey - The master encryption key
 * @returns {string} - The decrypted plaintext
 */
export function decryptSecretGCM(ciphertext, iv, tag, masterKey) {
  if (!ciphertext || !iv || !tag || !masterKey) {
    throw new Error('All parameters (ciphertext, iv, tag, masterKey) are required');
  }
  
  try {
    // Create a hash of the master key to ensure consistent length
    const key = createHash('sha256').update(masterKey).digest();
    
    // Create decipher with proper GCM mode
    const decipher = createDecipherGCM('aes-256-gcm');
    decipher.setKey(key);
    decipher.setIV(Buffer.from(iv, 'hex'));
    
    // Set the authentication tag
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    
    // Optional: Add additional authenticated data (must match encryption)
    const aad = Buffer.from('ai-gateway-provider-key');
    decipher.setAAD(aad);
    
    // Decrypt the ciphertext
    let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
    plaintext += decipher.final('utf8');
    
    return plaintext;
  } catch (error) {
    throw new Error(`Decryption failed: ${error.message}`);
  }
}

// Use the GCM versions by default for better security
export { encryptSecretGCM as encryptSecret, decryptSecretGCM as decryptSecret };


import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.SESSION_SECRET || 'default-secret-at-least-32-chars-long-!!';
// Derive 32-byte key
const key = crypto.createHash('sha256').update(ENCRYPTION_KEY).digest();

export function encrypt(text: string): string {
  if (!text) return '';
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decrypt(text: string): string {
  if (!text) return '';
  try {
    const parts = text.split(':');
    if (parts.length < 2) return '';
    const iv = Buffer.from(parts.shift()!, 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const decrypted = Buffer.concat([
      decipher.update(encryptedText),
      decipher.final()
    ]).toString('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed:', err);
    return '';
  }
}

export function maskApiKey(keyStr: string): string {
  if (!keyStr) return '';
  if (keyStr.length <= 8) return '********';
  return `${keyStr.slice(0, 6)}********${keyStr.slice(-4)}`;
}

import { generateKeyPairSync } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
mkdirSync('.test-data', { recursive: true });
const keys = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});
writeFileSync('.test-data/private.key', keys.privateKey);
writeFileSync('.test-data/public.key', keys.publicKey);
writeFileSync('.test-data/hmac.key', 'test-only-hmac-secret');
process.env.JWT_PRIVATE_KEY_PATH = resolve('.test-data/private.key');
process.env.JWT_PUBLIC_KEY_PATH = resolve('.test-data/public.key');
process.env.HMAC_KEY_PATH = resolve('.test-data/hmac.key');

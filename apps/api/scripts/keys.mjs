import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
for (const file of ['private.key', 'public.key', 'hmac.key'])
  if (existsSync(file))
    throw new Error(file + ' already exists; refusing to overwrite');
const keys = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});
writeFileSync('private.key', keys.privateKey, { mode: 0o600, flag: 'wx' });
writeFileSync('public.key', keys.publicKey, { flag: 'wx' });
writeFileSync('hmac.key', randomBytes(32).toString('hex'), {
  mode: 0o600,
  flag: 'wx',
});

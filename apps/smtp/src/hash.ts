import { createHash, createHmac, timingSafeEqual } from 'crypto';
import path from 'node:path';
import fs from 'node:fs/promises';
import config from './config';

const root = process.cwd();
const hmacKey = await fs.readFile(path.resolve(root, config.hmacKeyPath), {
  encoding: 'utf-8',
});
const sha256 = (plain: string): string => {
  return createHash('sha256').update(plain).digest('hex');
};

const generateHmac = (plain: string, key?: string): string => {
  return createHmac('sha256', key ?? hmacKey)
    .update(plain)
    .digest('hex');
};

const compareHmac = (plain: string, hmac: string, key?: string): boolean => {
  const compute = Buffer.from(generateHmac(plain, key), 'hex');
  const recevied = Buffer.from(hmac, 'hex');
  return (
    /^[a-f0-9]{64}$/i.test(hmac) &&
    compute.length === recevied.length &&
    timingSafeEqual(compute, recevied)
  );
};

export { sha256, generateHmac, compareHmac };

import bcrypt from 'bcrypt';
import { createHash, createHmac, timingSafeEqual } from 'crypto';
import path from 'node:path';
import { fileURLToPath } from 'url';
import fs from 'node:fs/promises';
import config from '@/config';

const SALT_ROUNDS = 10;
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..',
);
const hmacKey = await fs.readFile(path.resolve(root, config.hmacKeyPath), {
  encoding: 'utf-8',
});

const hash = async (plain: string): Promise<string> => {
  const hashed = await bcrypt.hash(plain, SALT_ROUNDS);
  return hashed;
};

const compareHash = async (plain: string, hashed: string): Promise<boolean> => {
  const match = await bcrypt.compare(plain, hashed);
  return match;
};

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
  return timingSafeEqual(compute, recevied);
};

export { hash, compareHash, sha256, generateHmac, compareHmac };

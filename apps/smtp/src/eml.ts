import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';

const makeEml = (stream: NodeJS.ReadableStream): Promise<string> => {
  return new Promise((resolve, reject) => {
    const filePath = path.resolve(os.tmpdir(), `${randomUUID()}.tmp.eml`);
    const output = fs.createWriteStream(filePath);

    stream.pipe(output);

    output.on('finish', () => {
      resolve(filePath);
    });

    output.on('error', reject);
    stream.on('error', reject);
  });
};

export { makeEml };

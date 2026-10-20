import { build } from 'esbuild';
import { cp } from 'node:fs/promises';
await build({
  entryPoints: ['src/index.ts'],
  outfile: 'dist/index.js',
  bundle: true,
  platform: 'node',
  format: 'esm',
  packages: 'external',
  target: 'node22',
  sourcemap: true,
});
await cp('src/mailer/template.html', 'dist/template.html');

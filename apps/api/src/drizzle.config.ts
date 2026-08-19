import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './migration',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DB_URL || '' },
});

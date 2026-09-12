import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations } from '@/schema';
import 'dotenv/config';

const DB_URL = process.env.DB_URL || 'localhost';
const pool = new Pool({
  connectionString: DB_URL,
});

const database = drizzle({ client: pool, relations });

export default database;

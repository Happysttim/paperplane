import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { relations } from '@/schema';
import config from '@/config';

const pool = new Pool({
  connectionString: config.dbUrl,
});

const database = drizzle({ client: pool, relations });

export default database;

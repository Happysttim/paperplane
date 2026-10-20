import database from '@/database';
import { destinations } from '@/schema';
import { and, eq, sql } from 'drizzle-orm';
const verified = database
  .select()
  .from(destinations)
  .where(
    and(
      eq(destinations.address, sql.placeholder('address')),
      eq(destinations.userId, sql.placeholder('userId')),
    ),
  )
  .prepare('destinations_verified');
const all = database
  .select()
  .from(destinations)
  .where(eq(destinations.userId, sql.placeholder('userId')))
  .prepare('destinations_all');
export default { verified, all };

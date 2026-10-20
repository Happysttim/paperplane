import database from '@/database';
import { domains } from '@/schema';
import { eq, sql } from 'drizzle-orm';

const first = database.query.domains.findFirst().prepare('domains_first');

const name = database
  .select()
  .from(domains)
  .where(eq(domains.name, sql.placeholder('name')))
  .prepare('domains_name');
const all = database
  .select()
  .from(domains)
  .orderBy(domains.id)
  .prepare('domains_all');
export default { first, name, all };

import database from '@/database';
import { sql } from 'drizzle-orm';

const id = database.query.forwards
  .findFirst({
    where: {
      id: {
        eq: sql.placeholder('id'),
      },
    },
  })
  .prepare('forwards_id');

export default {
  id,
};

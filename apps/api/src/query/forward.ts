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

const hasForward = database.query.forwards
  .findFirst({
    where: {
      id: {
        eq: sql.placeholder('forwardId'),
      },
      email: {
        id: {
          eq: sql.placeholder('emailId'),
        },
        users: {
          id: {
            eq: sql.placeholder('id'),
          },
        },
      },
    },
  })
  .prepare('forwards_has_forward');

export default {
  id,
  hasForward,
};

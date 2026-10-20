import database from '@/database';
import { sql } from 'drizzle-orm';

const findSession = database.query.sessions
  .findFirst({
    where: {
      refreshHash: {
        eq: sql.placeholder('refreshHash'),
      },
      revoke: {
        eq: sql.placeholder('revoke'),
      },
    },
  })
  .prepare('sessions_find_session');

export default { findSession };

import database from '@/database';
import { sql } from 'drizzle-orm';

const id = database.query.premiums
  .findFirst({
    where: {
      userId: sql.placeholder('id'),
    },
  })
  .prepare('premiums_id');

const notExpireUsers = database.query.premiums
  .findMany({
    where: {
      expiredAt: {
        gt: sql.placeholder('expired_at'),
      },
    },
    with: {
      user: true,
    },
    orderBy: {
      expiredAt: 'asc',
    },
  })
  .prepare('premiums_not_expire_users');

export default {
  id,
  notExpireUsers,
};

import database from '@/database';
import { emails, forwards } from '@/schema';
import { eq, sql } from 'drizzle-orm';

const id = database.query.users
  .findFirst({
    where: {
      id: {
        eq: sql.placeholder('id'),
      },
    },
  })
  .prepare('users_id');

const all = database.query.users.findMany().prepare('users_all');

const email = database.query.users
  .findFirst({
    where: {
      userEmail: {
        like: sql.placeholder('userEmail'),
      },
    },
  })
  .prepare('users_email');

const provider = database.query.users
  .findMany({
    where: {
      provider: {
        in: sql.placeholder('providers'),
      },
    },
  })
  .prepare('users_provider');

const providerEmail = database.query.users
  .findFirst({
    where: {
      userEmail: {
        like: sql.placeholder('userEmail'),
      },
      provider: {
        eq: sql.placeholder('provider'),
      },
    },
  })
  .prepare('users_providerEmail');

const hasEmails = database.query.users
  .findFirst({
    where: {
      id: sql.placeholder('id'),
    },
    with: {
      emails: true,
    },
    extras: {
      totalEmails: (table) =>
        database.$count(emails, eq(emails.userId, table.id)),
    },
  })
  .prepare('users_has_emails');

const hasEmailForwards = database.query.users
  .findFirst({
    where: {
      id: sql.placeholder('id'),
    },
    with: {
      emails: {
        with: {
          forwards: {
            orderBy: {
              updated_at: 'desc',
            },
          },
        },
        orderBy: {
          created_at: 'desc',
        },
        extras: {
          totalForwards: (table) =>
            database.$count(forwards, eq(forwards.emailId, table.id)),
        },
      },
    },
    extras: {
      totalEmails: (table) =>
        database.$count(emails, eq(emails.userId, table.id)),
    },
  })
  .prepare('users_has_email_forwards');

export default {
  id,
  all,
  email,
  provider,
  providerEmail,
  hasEmails,
  hasEmailForwards,
};

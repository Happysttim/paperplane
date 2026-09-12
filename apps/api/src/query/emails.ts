import database from '@/database';
import { forwards } from '@/schema';
import { eq, sql } from 'drizzle-orm';

const id = database.query.emails
  .findFirst({
    where: {
      id: {
        eq: sql.placeholder('id'),
      },
    },
  })
  .prepare('emails_id');

const source = database.query.emails
  .findFirst({
    where: {
      src: {
        like: sql.placeholder('src'),
      },
    },
  })
  .prepare('emails_source');

const forwardsWithSource = database.query.emails
  .findFirst({
    where: {
      src: {
        like: sql.placeholder('src'),
      },
    },
    with: {
      forwards: true,
    },
    extras: {
      totalForwards: (table) =>
        database.$count(forwards, eq(forwards.emailId, table.id)),
    },
  })
  .prepare('emails_forwards_with_source');

const forwardsWithId = database.query.emails
  .findFirst({
    where: {
      id: {
        eq: sql.placeholder('id'),
      },
    },
    with: {
      forwards: true,
    },
    extras: {
      totalForwards: (table) =>
        database.$count(forwards, eq(forwards.emailId, table.id)),
    },
  })
  .prepare('emails_forwards_with_id');

export default {
  id,
  source,
  forwardsWithSource,
  forwardsWithId,
};

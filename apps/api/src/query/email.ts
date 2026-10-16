import database from '@/database';
import { emails, forwards } from '@/schema';
import { count, eq, sql } from 'drizzle-orm';

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
  .findMany({
    where: {
      src: {
        in: sql.placeholder('srcs'),
      },
    },
    with: {
      forwards: true,
    },
  })
  .prepare('emails_source');

const forwardsWithSource = database.query.emails
  .findFirst({
    where: {
      src: {
        eq: sql.placeholder('src'),
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
      userId: {
        eq: sql.placeholder('userId'),
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

const pagination = database.query.emails
  .findMany({
    where: {
      userId: {
        eq: sql.placeholder('userId'),
      },
    },
    with: {
      forwards: true,
    },
    offset: sql.placeholder('offset'),
    limit: sql.placeholder('limit'),
    extras: {
      totalForwards: (table) =>
        database.$count(forwards, eq(forwards.emailId, table.id)),
    },
  })
  .prepare('emails_pagination');

const paginationCount = database
  .select({
    count: count(),
  })
  .from(emails)
  .where(eq(emails.userId, sql.placeholder('userId')))
  .prepare('emails_pagination_count');

export default {
  id,
  source,
  forwardsWithSource,
  forwardsWithId,
  pagination,
  paginationCount,
};

import database from '@/database';
import { destinations, emails, forwards } from '@/schema';
import { and, count, eq, sql } from 'drizzle-orm';

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
    orderBy: { id: 'desc' },
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

const routes = database
  .select({ src: emails.src, dest: forwards.dest, rule: forwards.rule })
  .from(emails)
  .innerJoin(forwards, eq(forwards.emailId, emails.id))
  .innerJoin(
    destinations,
    and(
      eq(destinations.userId, emails.userId),
      eq(destinations.address, forwards.dest),
    ),
  )
  .where(sql`${emails.src} = ANY(${sql.placeholder('sources')}::text[])`)
  .prepare('emails_verified_routes');

export default {
  routes,
  id,
  source,
  forwardsWithSource,
  forwardsWithId,
  pagination,
  paginationCount,
};

import database from '@/database';
import { deliveries, emails, forwards } from '@/schema';
import { and, count, desc, eq, sql } from 'drizzle-orm';

const route = database
  .select({ emailId: emails.id })
  .from(emails)
  .innerJoin(forwards, eq(forwards.emailId, emails.id))
  .where(
    and(
      eq(emails.src, sql.placeholder('source')),
      eq(forwards.dest, sql.placeholder('destination')),
    ),
  )
  .prepare('deliveries_route');

const event = database
  .select()
  .from(deliveries)
  .where(eq(deliveries.eventId, sql.placeholder('eventId')))
  .prepare('deliveries_event');

const pagination = database
  .select({ delivery: deliveries, source: emails.src })
  .from(deliveries)
  .innerJoin(emails, eq(emails.id, deliveries.emailId))
  .where(eq(emails.userId, sql.placeholder('userId')))
  .orderBy(desc(deliveries.id))
  .limit(sql.placeholder('limit'))
  .offset(sql.placeholder('offset'))
  .prepare('deliveries_pagination');

const paginationCount = database
  .select({ count: count() })
  .from(deliveries)
  .innerJoin(emails, eq(emails.id, deliveries.emailId))
  .where(eq(emails.userId, sql.placeholder('userId')))
  .prepare('deliveries_pagination_count');

export default { route, event, pagination, paginationCount };

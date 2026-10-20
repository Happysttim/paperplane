import {
  pgTable,
  serial,
  text,
  boolean,
  timestamp,
  pgEnum,
  uniqueIndex,
  json,
  varchar,
  integer,
  index,
} from 'drizzle-orm/pg-core';
import { defineRelations } from 'drizzle-orm';
import type { ForwardRule } from './rules';

export const providerEnum = pgEnum('provider', ['google', 'naver', 'local']);

export const sessions = pgTable(
  'sessions',
  {
    id: serial('id').primaryKey(),
    refreshHash: text('refresh_hash').notNull().unique(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    revoke: boolean('revoke').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    expiresAt: timestamp('expires_at').notNull(),
  },
  (table) => [index('refresh_hash_index').on(table.refreshHash)],
);

export type SessionModel = typeof sessions.$inferSelect;
export type SessionOptional = typeof sessions.$inferInsert;

export const domains = pgTable('domains', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
});

export type DomainModel = typeof domains.$inferSelect;
export type DomainOptional = typeof domains.$inferInsert;

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    userEmail: varchar('user_email', { length: 254 }).unique(),
    name: varchar('name', { length: 10 }).notNull(),
    passwordHash: text('password_hash'),
    provider: providerEnum('provider').default('local').notNull(),
    providerId: varchar('provider_id', { length: 100 }),
    hasPremium: boolean('has_premium').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_email_index').on(table.userEmail),
    uniqueIndex('user_provider_index').on(table.provider, table.providerId),
  ],
);

export type UserModel = typeof users.$inferSelect;
export type UserOptional = typeof users.$inferInsert;

export const premiums = pgTable('premiums', {
  userId: integer('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull()
    .primaryKey(),
  startedAt: timestamp('started_at').notNull(),
  expiredAt: timestamp('expired_at').notNull(),
});

export type PremiumModel = typeof premiums.$inferSelect;
export type PremiumOptional = typeof premiums.$inferInsert;

export const emails = pgTable(
  'emails',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .references(() => users.id, { onDelete: 'cascade' })
      .notNull(),
    src: varchar('src_email', { length: 254 }).notNull().unique(),
    domainId: integer('domain_id')
      .references(() => domains.id)
      .notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('user_id_index').on(table.userId),
    uniqueIndex('src_email_index').on(table.src),
  ],
);

export type EmailModel = typeof emails.$inferSelect;
export type EmailOptional = typeof emails.$inferInsert;

export const forwards = pgTable('forwards', {
  id: serial('id').primaryKey(),
  emailId: integer('email_id')
    .references(() => emails.id, { onDelete: 'cascade' })
    .notNull(),
  rule: json('rule').$type<ForwardRule>().default([]),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  dest: varchar('forward_email', { length: 254 }).notNull(),
});

export type ForwardModel = typeof forwards.$inferSelect;
export type ForwardOptional = typeof forwards.$inferInsert;

export const destinations = pgTable(
  'destinations',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    address: varchar('address', { length: 254 }).notNull(),
    verifiedAt: timestamp('verified_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('destination_user_address').on(table.userId, table.address),
  ],
);

export const deliveries = pgTable(
  'deliveries',
  {
    id: serial('id').primaryKey(),
    eventId: varchar('event_id', { length: 100 }).notNull().unique(),
    emailId: integer('email_id')
      .notNull()
      .references(() => emails.id, { onDelete: 'cascade' }),
    destination: varchar('destination', { length: 254 }).notNull(),
    messageId: varchar('message_id', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull(),
    detail: varchar('detail', { length: 500 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('delivery_email_created').on(table.emailId, table.createdAt),
  ],
);

export const relations = defineRelations(
  { users, premiums, emails, forwards, domains, sessions },
  (r) => ({
    domains: {
      emails: r.many.emails(),
    },
    users: {
      emails: r.many.emails(),
    },
    premiums: {
      user: r.one.users({
        from: r.premiums.userId,
        to: r.users.id,
        optional: false,
      }),
    },
    emails: {
      forwards: r.many.forwards(),
      domains: r.one.domains({
        from: r.emails.domainId,
        to: r.domains.id,
        optional: false,
      }),
      users: r.one.users({
        from: r.emails.userId,
        to: r.users.id,
        optional: false,
      }),
    },
    forwards: {
      email: r.one.emails({
        from: r.forwards.emailId,
        to: r.emails.id,
        optional: false,
      }),
    },
  }),
);

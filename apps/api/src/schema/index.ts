import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
  uniqueIndex,
  json,
} from 'drizzle-orm/pg-core';
import { defineRelations } from 'drizzle-orm';
import type { ForwardRule } from './rules';

export const providerEnum = pgEnum('provider', ['google', 'naver', 'local']);

export const domains = pgTable('domains', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});

export type DomainModel = typeof domains.$inferSelect;
export type DomainOptional = typeof domains.$inferInsert;

export const users = pgTable(
  'users',
  {
    id: serial('id').primaryKey(),
    userEmail: text('user_email').unique(),
    passwordHash: text('password_hash'),
    provider: providerEnum('provider').default('local').notNull(),
    providerId: text('provider_id'),
    hasPremium: boolean('has_premium').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => [uniqueIndex('user_email_index').on(table.userEmail)],
);

export type UserModel = typeof users.$inferSelect;
export type UserOptional = typeof users.$inferInsert;

export const premiums = pgTable('premiums', {
  userId: integer('user_id')
    .references(() => users.id)
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
      .references(() => users.id)
      .notNull(),
    src: text('src_email').notNull().unique(),
    domainId: integer('domain_id')
      .references(() => domains.id)
      .notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('user_id_index').on(table.userId),
    uniqueIndex('src_email_index').on(table.src),
  ],
);

export type EmailModel = typeof emails.$inferSelect;
export type EmailOptional = typeof emails.$inferInsert;

export const forwards = pgTable('forwards', {
  id: serial('id').primaryKey(),
  emailId: integer('email_id')
    .references(() => emails.id)
    .notNull(),
  rule: json('rule').$type<ForwardRule>().default([]),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  dest: text('forward_email').notNull(),
});

export type ForwardModel = typeof forwards.$inferSelect;
export type ForwardOptional = typeof forwards.$inferInsert;

export const relations = defineRelations(
  { users, premiums, emails, forwards, domains },
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

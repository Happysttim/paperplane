import {
  pgTable,
  serial,
  text,
  boolean,
  integer,
  timestamp,
  pgEnum,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const providerEnum = pgEnum('provider', ['google', 'naver', 'local']);

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  userId: text('user_id').unique(),
  passwordHash: text('password_hash'),
  provider: providerEnum('provider').default('local').notNull(),
  providerId: text('provider_id'),
  hasPremium: boolean('has_premium').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const premiums = pgTable('premiums', {
  userId: integer('user_id')
    .references(() => users.id)
    .notNull()
    .primaryKey(),
  startedAt: timestamp('started_at').notNull(),
  expiredAt: timestamp('expired_at').notNull(),
});

export const emails = pgTable('emails', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .references(() => users.id)
    .notNull(),
  src: text('src_email'),
  expired: boolean('expired').default(false).notNull(),
});

export const forwards = pgTable('forwards', {
  id: serial('id').primaryKey(),
  emailId: integer('email_id')
    .references(() => emails.id)
    .notNull(),
  role: text('role'),
  dest: text('forward_email').notNull(),
});

export const usersRelations = relations(users, ({ many }) => ({
  emails: many(emails),
}));

export const premiumsRelations = relations(premiums, ({ one }) => ({
  user: one(users, {
    fields: [premiums.userId],
    references: [users.id],
  }),
}));

export const emailsRelations = relations(emails, ({ many }) => ({
  forwards: many(forwards),
}));

import type { EmailOptional } from '@/schema';
import { emails } from '@/schema';
import type { SQL } from 'drizzle-orm';
import { createOne, deleteMany, updateMany } from '.';

const create = async (email: EmailOptional) =>
  createOne(emails, email, { target: emails.src });

const update = async (set: EmailOptional, sql?: SQL) =>
  updateMany(emails, set, sql);

const remove = async (sql?: SQL) => deleteMany(emails, sql);

export default { create, update, remove };

import type { UserOptional } from '@/schema';
import { users } from '@/schema';
import type { SQL } from 'drizzle-orm';
import { createOne, deleteMany, updateMany } from '.';

const create = async (user: UserOptional) =>
  createOne(users, user, { target: [users.userEmail] });

const update = async (set: Partial<UserOptional>, sql?: SQL) =>
  updateMany(users, set, sql);

const remove = async (sql?: SQL) => deleteMany(users, sql);

export default { create, update, remove };

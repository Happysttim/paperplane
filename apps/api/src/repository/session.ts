import type { SessionOptional } from '@/schema';
import { sessions } from '@/schema';
import type { SQL } from 'drizzle-orm';
import { createOne, deleteMany, updateMany } from '.';

const create = async (session: SessionOptional) =>
  createOne(sessions, session, { target: sessions.refreshHash });

const update = async (session: SessionOptional, sql?: SQL) =>
  updateMany(sessions, session, sql);

const remove = async (sql?: SQL) => deleteMany(sessions, sql);

export default { create, update, remove };

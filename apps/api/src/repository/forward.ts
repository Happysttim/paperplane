import type { ForwardOptional } from '@/schema';
import { forwards } from '@/schema';
import type { SQL } from 'drizzle-orm';
import { createOne, deleteMany, updateMany } from '.';

const create = async (forward: ForwardOptional) =>
  createOne(forwards, forward, { target: [forwards.emailId, forwards.dest] });

const update = async (set: Partial<ForwardOptional>, sql?: SQL) =>
  updateMany(forwards, set, sql);

const remove = async (sql?: SQL) => deleteMany(forwards, sql);

export default { create, update, remove };

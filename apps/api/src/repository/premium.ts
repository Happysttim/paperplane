import type { PremiumOptional } from '@/schema';
import { premiums } from '@/schema';
import type { SQL } from 'drizzle-orm';
import { createOne, deleteMany, updateMany } from '.';

const create = async (premium: PremiumOptional) =>
  createOne(premiums, premium, { target: premiums.userId });

const update = async (set: PremiumOptional, sql?: SQL) =>
  updateMany(premiums, set, sql);

const remove = async (sql?: SQL) => deleteMany(premiums, sql);

export default { create, update, remove };

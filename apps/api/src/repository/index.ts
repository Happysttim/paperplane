import database from '@/database';
import type { InferInsertModel, InferSelectModel, SQL } from 'drizzle-orm';
import type { IndexColumn, PgTable } from 'drizzle-orm/pg-core';

type CreateConfig = {
  target?: IndexColumn | IndexColumn[];
  where?: SQL;
};

const createOne = async <TTable extends PgTable>(
  table: TTable,
  insert: InferInsertModel<TTable>,
  config?: CreateConfig,
): Promise<InferSelectModel<TTable> | undefined> => {
  const executed = await database
    .insert(table)
    .values(insert)
    .onConflictDoNothing(config)
    .returning();

  const result = executed as InferSelectModel<TTable>[];
  return result[0];
};

const updateMany = async <TTable extends PgTable>(
  table: TTable,
  set: Partial<InferInsertModel<TTable>>,
  sql?: SQL,
): Promise<InferSelectModel<TTable>[]> => {
  const executed = await database.update(table).set(set).where(sql).returning();
  return executed as InferSelectModel<TTable>[];
};

const deleteMany = async <TTable extends PgTable>(
  table: TTable,
  sql?: SQL,
): Promise<InferSelectModel<TTable>[]> => {
  const executed = await database.delete(table).where(sql).returning();
  return executed as InferSelectModel<TTable>[];
};

export { createOne, updateMany, deleteMany };

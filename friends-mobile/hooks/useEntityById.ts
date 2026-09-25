import { db } from '@/lib/db';
import { devLogger } from '@/lib/utils/devLogger';
import { useQuery } from '@tanstack/react-query';
import { getTableName, eq } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';

type IdentifiableTable = SQLiteTable & { id: SQLiteColumn };

/**
 * Fetch a single row by id for edit screens. Replaces the hand-rolled
 * useState(loading) + useEffect(db.select().where(eq(t.id, id)).limit(1))
 * + try/catch block that every add/edit screen was copying.
 *
 * `id` undefined (i.e. "add" mode) → never fetches; `isLoading`/`notFound` stay false.
 */
export function useEntityById<T>(table: IdentifiableTable, id: string | undefined) {
  const query = useQuery<T | null>({
    queryKey: ['entityById', getTableName(table), id],
    enabled: !!id,
    queryFn: async () => {
      try {
        const rows = await db.select().from(table).where(eq(table.id, id!)).limit(1);
        return (rows[0] as T | undefined) ?? null;
      } catch (error) {
        devLogger.error('useEntityById: failed to load row', {
          table: getTableName(table),
          id,
          error,
        });
        throw error;
      }
    },
  });

  return {
    data: query.data ?? null,
    isLoading: !!id && query.isPending,
    notFound: !!id && !query.isPending && query.data == null,
    error: query.error,
  };
}

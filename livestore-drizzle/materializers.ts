import { State } from "@livestore/livestore"
import { type AnySQLiteSelectQueryBuilder, QueryBuilder, SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { Record } from "effect"

type Materializer = (qb: QueryBuilder) => AnySQLiteSelectQueryBuilder
type MaterializerArms = Record<string, Materializer>

export const DrizzleMaterializers = <E extends Record<string, Materializer>>(
  events: E,
): DrizzleMaterializers<E> =>
  Record.map(events, (materializer) => {
    const built = materializer(new QueryBuilder(new SQLiteSyncDialect()))
    const { sql, params } = built.toSQL()
    return {
      query: sql,
      bindValues: params as never,
      writeTables: new Set([built._.tableName]), // TODO: ensure this is correct
    }
  }) as never

export type DrizzleMaterializers<E extends MaterializerArms> = {
  [K in keyof E]: State.SQLite.EventDef.Any
}

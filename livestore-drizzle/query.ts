import type { Store } from "@livestore/livestore"
import {
  type AnySQLiteSelectQueryBuilder,
  QueryBuilder,
  SQLiteCustomColumn,
  SQLiteSyncDialect,
} from "drizzle-orm/sqlite-core"
import * as Record from "effect/Record"

export const query = <Built extends Pick<AnySQLiteSelectQueryBuilder, "_" | "toSQL">>(
  store: Store<any, any>,
  build: (qb: QueryBuilder) => Built,
): Built["_"]["result"] => {
  const built = build(new QueryBuilder(new SQLiteSyncDialect()))
  const { sql, params } = built.toSQL()
  const rows = store.query({
    query: sql,
    bindValues: params as never,
  }) as Array<unknown>
  return rows.map((row) =>
    Record.map(built._.selectedFields, (col_, key) => {
      const col = col_ as SQLiteCustomColumn<any>
      return col.mapFromDriverValue((row as never)[key])
    })
  )
}

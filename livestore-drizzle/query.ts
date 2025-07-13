import type { Store } from "@livestore/livestore"
import type { ColumnsSelection } from "drizzle-orm"
import { BaseSQLiteDatabase, SQLiteCustomColumn, SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import * as Record from "effect/Record"

export interface Query<T> {
  sql: string
  bindValues: Array<unknown>
  run: (store: Store<any, any>) => Array<T>
}

export const query = <
  Built extends {
    _: {
      result: Array<unknown>
      selectedFields?: ColumnsSelection
    }
    toSQL: () => {
      sql: string
      params: Array<unknown>
    }
  },
>(
  build: (_: BaseSQLiteDatabase<"sync", any, any>) => Built,
): Query<Built["_"]["result"]> => {
  const mock = new BaseSQLiteDatabase(
    "sync",
    new SQLiteSyncDialect(),
    null!,
    null!,
  )
  const built = build(mock)
  const { sql, params } = built.toSQL()
  return {
    sql,
    bindValues: params,
    run: (store) =>
      (store
        .query({
          query: sql,
          bindValues: params as never,
        }) as Array<unknown>)
        .map((row) => {
          const { selectedFields } = built._
          return selectedFields
            ? Record.map(selectedFields, (col_, key) => {
              const col = col_ as SQLiteCustomColumn<any>
              return col.mapFromDriverValue((row as never)[key])
            })
            : undefined
        }) as never,
  }
}

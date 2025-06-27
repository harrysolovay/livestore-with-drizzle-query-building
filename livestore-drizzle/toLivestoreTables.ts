import { Schema, SqliteDsl, State } from "@livestore/livestore"
import { getTableColumns, getTableName } from "drizzle-orm"
import { SQLiteColumn, type AnySQLiteTable, type TableConfig } from "drizzle-orm/sqlite-core"
import { Option, pipe, Record } from "effect"

type LivestoreColumnDef<T, TDriver = T> = SqliteDsl.ColumnDefinition<T, TDriver>
type InferColumnType<T extends SQLiteColumn<any>> = T extends SQLiteColumn<infer U> 
  ? U extends { data: any }
    ? U["data"]
    : never
  : never

const SQLiteColumnType = ["SQLiteInteger", "SQLiteReal", "SQLiteText", "SQLiteBlob", "SQLiteBoolean", "SQLiteTimestamp"] as const;
type SQLiteColumnType = (typeof SQLiteColumnType)[number];


// TODO: Fix the types / provide a better interface for this
const toLivestoreSchema = <T extends SQLiteColumn<any>>(col: T) => {
  const baseConfig = {
    primaryKey: col.primary ?? false,
    nullable: col.notNull,
    default: col.default,
  }

  console.log(baseConfig)

  return pipe(
    Option.fromNullable(col instanceof SQLiteColumn ? col.columnType : null),
    Option.match({
      onNone: () => {
        throw new Error("Invalid column type")
      },
      onSome: (columnType: SQLiteColumnType) => {
        switch (columnType) {
          case "SQLiteText":
            return State.SQLite.text({...baseConfig, schema: Schema.String}) as LivestoreColumnDef<string>
          case "SQLiteInteger":
            return State.SQLite.integer({...baseConfig, schema: Schema.Number}) as LivestoreColumnDef<number>
          case "SQLiteReal":
            return State.SQLite.real({ ...baseConfig }) as LivestoreColumnDef<number>
          case "SQLiteBoolean":
            // @ts-expect-error - TODO: Fix the types / provide a better interface for this
            return State.SQLite.boolean({...baseConfig, schema: Schema.Boolean}) as LivestoreColumnDef<boolean>
          case "SQLiteTimestamp":
            return State.SQLite.integer({ ...baseConfig, schema: Schema.DateFromNumber }) as unknown as LivestoreColumnDef<number>
          //TODO: Add blob support
          case "SQLiteBlob":
            // @ts-expect-error - TODO: Fix the types / provide a better interface for this
            return State.SQLite.blob({...baseConfig, schema: Schema.Uint8Array}) as LivestoreColumnDef<Uint8Array<ArrayBufferLike>>
          default:
            throw new Error(`Unsupported column type: ${columnType}`)
        }
      }
    })
  )
}

const toLivestoreTable = <T extends TableConfig>(def: AnySQLiteTable<T>) => {
  const name = getTableName(def)
  const columns = getTableColumns(def)
  const columnSchemas = Record.map(columns, (col) => toLivestoreSchema(col))
  
  return State.SQLite.table({
    name,
    columns: columnSchemas as unknown as {
      [K in keyof T['columns']]:LivestoreColumnDef<InferColumnType<T['columns'][K]>>
    }
  })
}

export const toLivestoreTables = <T extends Record<string, AnySQLiteTable<TableConfig>>>(
  tables: T,
) => {
  return Record.map(tables, (def) => toLivestoreTable(def)) as {
    [K in keyof T]: ReturnType<typeof toLivestoreTable<T[K]['_']["config"]>>
  }
}

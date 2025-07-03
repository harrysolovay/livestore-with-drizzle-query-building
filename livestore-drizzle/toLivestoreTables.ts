import { Schema, SqliteDsl, State } from "@livestore/livestore"
import { getTableColumns, getTableName } from "drizzle-orm"
import { type AnySQLiteTable, SQLiteColumn, type TableConfig } from "drizzle-orm/sqlite-core"
import * as Option from "effect/Option"
import * as Record from "effect/Record"

export const toLivestoreTables = <T extends Record<string, AnySQLiteTable<TableConfig>>>(
  tables: T,
): { [K in keyof T]: ToLivestoreTable<T[K]> } => {
  return Record.map(tables, (def) => toLivestoreTable(def)) as never
}

const toLivestoreTable = (def: AnySQLiteTable<TableConfig>) =>
  State.SQLite.table({
    name: getTableName(def),
    columns: Record.map(getTableColumns(def), (col) => toLivestoreSchema(col)),
  })

type SQLiteColumnType =
  | "SQLiteInteger"
  | "SQLiteReal"
  | "SQLiteText"
  | "SQLiteBlob"
  | "SQLiteBoolean"
  | "SQLiteTimestamp"

// TODO: support `customType` by creating `Schema` from transform.
const toLivestoreSchema = <T extends SQLiteColumn<any>>(col: T) => {
  const baseConfig = {
    default: col.default,
    nullable: col.notNull,
    primaryKey: col.primary ?? false,
  }
  const columnType = col.columnType as SQLiteColumnType
  switch (columnType) {
    case "SQLiteText":
      return State.SQLite.text({ ...baseConfig, schema: Schema.String })
    case "SQLiteInteger":
      return State.SQLite.integer({ ...baseConfig, schema: Schema.Number })
    case "SQLiteReal":
      return State.SQLite.real({ ...baseConfig })
    case "SQLiteBoolean":
      return State.SQLite.boolean({
        ...baseConfig,
      })
    case "SQLiteTimestamp":
      return State.SQLite.integer({
        ...baseConfig,
        schema: Schema.DateFromNumber,
      })
    // TODO: Add blob support
    case "SQLiteBlob":
      return State.SQLite.blob(baseConfig)
    default:
      throw new Error(`Unsupported column type: ${columnType}`)
  }
}

type ToLivestoreTable<T extends AnySQLiteTable<TableConfig>> = T["_"]["columns"] extends
  infer Columns extends Record<string, SQLiteColumn<any, object, object>> ? State.SQLite.TableDef<
    SqliteDsl.TableDefinition<
      T["_"]["name"],
      {
        [K in keyof Columns]: Columns[K] extends SQLiteColumn<infer U> ? {
            readonly columnType: SqliteDsl.FieldColumnType
            readonly schema: Schema.Schema<U["data"], U["driverParam"]>
            readonly default: Option.Option<U["data"]>
            readonly nullable: U["notNull"] extends true ? false : true
            readonly primaryKey: U["isPrimaryKey"]
          }
          : never
      }
    >,
    {
      isClientDocumentTable: false
    }
  >
  : never

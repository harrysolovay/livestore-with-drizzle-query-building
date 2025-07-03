import { makeAdapter } from "@livestore/adapter-node"
import { createStorePromise, Events, makeSchema, Schema, State } from "@livestore/livestore"
import { eq, or } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { query, toLivestoreTables } from "livestore-drizzle"

// Define events for book operations
const events = {
  bookAdded: Events.synced({
    name: "v1.BookAdded",
    schema: Schema.Struct({
      id: Schema.Int,
      title: Schema.String,
      author: Schema.String,
      lastModified: Schema.Date,
      deleted: Schema.Boolean,
    }),
  }),
  bookRemoved: Events.synced({
    name: "v1.BookRemoved",
    schema: Schema.Struct({
      id: Schema.Int,
      lastModified: Schema.Date,
      deleted: Schema.Boolean,
    }),
  }),
}

// Define Drizzle tables
export const tables = {
  books: sqliteTable("books", {
    id: integer().primaryKey().notNull(),
    title: text().notNull().default(""),
    author: text().notNull().default(""),
    deleted: integer({ mode: "boolean" }),
    lastModified: integer().notNull().default(0),
  }),
}

const livestoreTables = toLivestoreTables(tables)

// Define materializers for handling events
const materializers = State.SQLite.materializers(events, {
  "v1.BookAdded": ({ id, title, author, lastModified, deleted }) => {
    console.log({ id, title, author, lastModified, deleted })
    return livestoreTables.books.insert({
      id,
      title,
      author,
      deleted,
      lastModified: lastModified.getTime(),
    })
  },
  "v1.BookRemoved": ({ id }) =>
    livestoreTables.books.delete().where({
      id,
    }),
})

// Create schema
const schema = makeSchema({
  events,
  state: State.SQLite.makeState({
    tables: livestoreTables,
    materializers,
  }),
})

// Setup adapter
const adapter = makeAdapter({
  storage: {
    type: "fs",
    baseDirectory: "tmp",
  },
})

// Create and initialize store
const controller = new AbortController()
const store = await createStorePromise({
  adapter,
  schema,
  storeId: "books-store",
  signal: controller.signal,
})

// Add a book
// store.commit(
//   events.bookAdded({
//     id: 2,
//     title: "The Great Gatsby",
//     author: "F. Scott Fitzgerald",
//     lastModified: new Date(),
//     deleted: false,
//   }),
// )

// Query using Drizzle
const rows = query(store, (qb) =>
  qb
    .select()
    .from(tables.books)
    .where(or(
      eq(tables.books.id, 1),
      eq(tables.books.id, 2),
    )))

console.log(rows)

controller.abort()

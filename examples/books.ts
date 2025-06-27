import { makeAdapter } from "@livestore/adapter-node"
import { createStorePromise, Events, makeSchema, Schema, State } from "@livestore/livestore"
import { eq } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"
import { query, toDrizzleTables, toLivestoreTables } from "livestore-drizzle"

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
export const drizzleTables = {
  books: sqliteTable("books", {
    id: integer().primaryKey().notNull(),
    title: text().notNull().default(""),
    author: text().notNull().default(""),
    deleted: integer({mode: "boolean"}),
    lastModified: integer().notNull().default(0),
  }),
}

const tables = toLivestoreTables(drizzleTables)

// Define materializers for handling events
const materializers = State.SQLite.materializers(events, {
  "v1.BookAdded": ({ id,  title, author, lastModified, deleted }) => {
    return tables.books.insert({
        id,
        title,
        author,
        deleted,
        lastModified: lastModified.getTime()

    })
  },
    "v1.BookRemoved": ({ id }) => {
      return tables.books.delete().where({
        id,
    })
  },
})

// Create schema
const schema = makeSchema({
  events,
  state: State.SQLite.makeState({
    tables,
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

let id = 2;
// Example usage (commented out)
// Add a book
store.commit(
  events.bookAdded({
    id,
    title: "The Great Gatsby",
    author: "F. Scott Fitzgerald",
    lastModified: new Date(),
    deleted: false,
  }),
)
id++;

// Query a book
const maybeBook = store.query(
  tables.books.where({
    id: 1,
  }).first({
    fallback: () => undefined,
  }),
)

//Query using Drizzle
const { books } = toDrizzleTables(tables)
const rows = query(store, (qb) =>
  qb
    .select()
    .from(books)
    .where(eq(books.id, 1)))

console.log(rows)

// Cleanup
controller.abort()

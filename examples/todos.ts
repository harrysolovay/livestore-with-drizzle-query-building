import { makeAdapter } from "@livestore/adapter-node"
import { createStorePromise, Events, makeSchema, Schema, State } from "@livestore/livestore"
import { eq } from "drizzle-orm"
import { query, toDrizzleTables } from "livestore-drizzle"

const events = {
  todoCreated: Events.synced({
    name: "v1.TodoCreated",
    schema: Schema.Struct({
      id: Schema.Int,
      text: Schema.String,
      date: Schema.Date,
    }),
  }),
  todoCompleted: Events.synced({
    name: "v1.TodoCompleted",
    schema: Schema.Struct({
      id: Schema.Int,
      date: Schema.Date,
    }),
  }),
  todoUncompleted: Events.synced({
    name: "v1.TodoUncompleted",
    schema: Schema.Struct({
      id: Schema.Int,
      date: Schema.Date,
    }),
  }),
}

const tables = {
  todos: State.SQLite.table({
    name: "todos",
    columns: {
      id: State.SQLite.integer({ primaryKey: true }),
      text: State.SQLite.text({ default: "" }),
      completed: State.SQLite.boolean({ default: false }),
      lastModified: State.SQLite.integer({
        schema: Schema.DateFromNumber,
      }),
    },
  }),
}

const { todos } = toDrizzleTables(tables)

const materializers = State.SQLite.materializers(events, {
  "v1.TodoCreated": ({ id, text, date }) =>
    query((_) => {
      return _.insert(todos).values({
        id,
        lastModified: date,
        text,
        completed: false,
      })
    }),
  "v1.TodoCompleted": ({ id, date }) =>
    query((_) => {
      return _.update(todos).set({
        completed: true,
        lastModified: date,
      }).where(eq(todos.id, id))
    }),
  "v1.TodoUncompleted": ({ id, date }) =>
    query((_) => {
      return _.update(todos).set({
        completed: false,
        lastModified: date,
      }).where(eq(todos.id, id))
    }),
})

const schema = makeSchema({
  events,
  state: State.SQLite.makeState({
    tables,
    materializers,
  }),
})

const adapter = makeAdapter({
  storage: {
    type: "fs",
    baseDirectory: "tmp",
  },
})

const controller = new AbortController()
const store = await createStorePromise({
  adapter,
  schema,
  storeId: "todos-store",
  signal: controller.signal,
})

// store.commit(
//   events.todoCompleted({
//     id: 6,
//     date: new Date(),
//   }),
// )

const rows = query((_) =>
  _
    .select()
    .from(todos)
    .where(eq(todos.id, 6))
).run(store)

console.log(rows)

controller.abort()

import { LivestoreDrizzleError } from "./LivestoreDrizzleError.ts"

export function assert(expr: unknown, msg = ""): asserts expr {
  if (!expr) throw new LivestoreDrizzleError(msg)
}

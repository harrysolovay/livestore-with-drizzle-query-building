export function assert(expr: unknown, msg = ""): asserts expr {
  if (!expr) throw new Error(msg)
}

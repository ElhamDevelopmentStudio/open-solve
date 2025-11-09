type JsonPrimitive = string | number | boolean | null;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function normalize(value: unknown, seen: WeakSet<object>): unknown {
  if (value === null) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalize(item, seen));
  }

  if (isPlainObject(value)) {
    if (seen.has(value)) {
      return "[Circular]";
    }
    seen.add(value);
    const entries = Object.keys(value)
      .sort()
      .map((key) => [key, normalize(value[key], seen)] as const);
    const normalized: Record<string, unknown> = {};
    for (const [key, normalizedValue] of entries) {
      normalized[key] = normalizedValue;
    }
    seen.delete(value);
    return normalized;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Set) {
    return Array.from(value)
      .sort()
      .map((item) => normalize(item, seen));
  }

  if (value instanceof Map) {
    return Array.from(value.entries())
      .sort(([a], [b]) => (a > b ? 1 : -1))
      .map(([key, val]) => [key, normalize(val, seen)]);
  }

  return value as JsonPrimitive;
}

export function stableHash(value: unknown): string {
  const normalized = normalize(value, new WeakSet());
  return JSON.stringify(normalized);
}

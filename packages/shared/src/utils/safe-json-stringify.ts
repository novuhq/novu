/**
 * JSON.stringify that replaces circular references with `[Circular]` instead of throwing.
 * Use when serializing unknown errors (e.g. Axios) that may reference sockets or parsers.
 * Stack algorithm matches json-stringify-safe so shared non-circular references stay valid.
 */
export function safeJsonStringify(value: unknown): string {
  const stack: unknown[] = [];

  try {
    return JSON.stringify(value, function replacer(this: unknown, _key: string, innerValue: unknown) {
      if (typeof innerValue !== 'object' || innerValue === null) {
        return innerValue;
      }

      if (stack.length > 0) {
        const thisPos = stack.indexOf(this);
        if (thisPos !== -1) {
          stack.splice(thisPos + 1);
        } else {
          stack.push(this);
        }

        if (stack.includes(innerValue)) {
          return '[Circular]';
        }

        stack.push(innerValue);
      } else {
        stack.push(innerValue);
      }

      return innerValue;
    });
  } catch {
    if (value instanceof Error) {
      return JSON.stringify({ message: value.message, name: value.name });
    }

    return JSON.stringify({ message: String(value) });
  }
}

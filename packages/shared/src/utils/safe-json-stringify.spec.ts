import { describe, expect, it } from 'vitest';
import { safeJsonStringify } from './safe-json-stringify';

describe('safeJsonStringify', () => {
  it('stringifies plain objects', () => {
    expect(safeJsonStringify({ a: 1 })).toBe('{"a":1}');
  });

  it('does not throw on circular references', () => {
    const a: Record<string, unknown> = { name: 'a' };
    const b: Record<string, unknown> = { name: 'b' };
    a.ref = b;
    b.ref = a;

    const result = safeJsonStringify(a);

    expect(result).toContain('"ref"');
    expect(result).toContain('[Circular]');
  });

  it('handles TLSSocket-like axios error shape without throwing', () => {
    const socket = { parser: {} as { socket?: unknown } };
    socket.parser.socket = socket;

    const err = {
      message: 'request failed',
      config: { url: 'https://example.com' },
      request: { socket },
    };

    const result = safeJsonStringify(err);

    expect(result).toContain('request failed');
    expect(result).toContain('[Circular]');
  });

  it('keeps duplicate object references that are not circular', () => {
    const shared = { x: 1 };
    const root = { a: shared, b: shared };

    const result = safeJsonStringify(root);

    expect(result).toBe('{"a":{"x":1},"b":{"x":1}}');
  });
});

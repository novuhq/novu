import { describe, expect, it } from 'vitest';
import { normalizeControlData } from './normalize-controls.utils';

describe('normalizeControlData', () => {
  it('should keep valid JSON strings as-is', () => {
    const input = {
      data: '{"key":"value"}',
      array: '[1,2,3]',
    };

    const result = normalizeControlData(input);

    expect(result).toEqual({
      data: '{"key":"value"}',
      array: '[1,2,3]',
    });
  });

  it('should repair invalid JSON strings with single quotes', () => {
    const input = {
      data: "{'key':'value'}",
      nested: "{'outer':{'inner':'value'}}",
    };

    const result = normalizeControlData(input);

    expect(result.data).toBe('{"key":"value"}');
    expect(result.nested).toBe('{"outer":{"inner":"value"}}');
  });

  it('should keep plain strings as-is', () => {
    const input = {
      plain: 'hello world',
      email: 'test@example.com',
    };

    const result = normalizeControlData(input);

    expect(result).toEqual({
      plain: 'hello world',
      email: 'test@example.com',
    });
  });

  it('should keep incomplete JSON-like strings as-is', () => {
    const input = {
      incomplete: '{123',
      justBrace: '{',
    };

    const result = normalizeControlData(input);

    expect(result).toEqual({
      incomplete: '{123',
      justBrace: '{',
    });
  });

  it('should handle nested objects recursively', () => {
    const input = {
      level1: {
        level2: {
          data: "{'key':'value'}",
          plain: 'hello',
        },
      },
    };

    const result = normalizeControlData(input) as any;

    expect(result.level1.level2.data).toBe('{"key":"value"}');
    expect(result.level1.level2.plain).toBe('hello');
  });

  it('should handle arrays in JSON strings', () => {
    const input = {
      array: "['item1','item2']",
    };

    const result = normalizeControlData(input);

    expect(result.array).toBe('["item1","item2"]');
  });

  it('should handle null/undefined by returning empty object', () => {
    const result1 = normalizeControlData(null as any);
    const result2 = normalizeControlData(undefined as any);

    expect(result1).toEqual({});
    expect(result2).toEqual({});
  });

  it('should keep strings that cannot be repaired', () => {
    const input = {
      unrepairable: '{invalid json that cannot be fixed',
    };

    const result = normalizeControlData(input);

    expect(result.unrepairable).toBe('{invalid json that cannot be fixed');
  });

  it('should handle empty object', () => {
    const input = {};

    const result = normalizeControlData(input);

    expect(result).toEqual({});
  });

  it('should preserve non-string, non-object values', () => {
    const input = {
      number: 123,
      boolean: true,
      nullValue: null,
      array: [1, 2, 3],
    };

    const result = normalizeControlData(input);

    expect(result.number).toBe(123);
    expect(result.boolean).toBe(true);
    expect(result.nullValue).toBe(null);
    expect(result.array).toEqual([1, 2, 3]);
  });

  it('should handle empty JSON strings (too short to process)', () => {
    const input = {
      emptyObject: '{}',
      emptyArray: '[]',
    };

    const result = normalizeControlData(input);

    // Empty JSON strings are kept as-is (length <= 2, so not processed)
    expect(result.emptyObject).toBe('{}');
    expect(result.emptyArray).toBe('[]');
  });
});

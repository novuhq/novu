import { describe, expect, it } from 'vitest';
import {
  expandJsonStringControlValues,
  JSON_STRING_WRAPPER_KEY,
  normalizeControlData,
  restoreJsonStringControlValues,
} from './normalize-controls.utils';

describe('normalizeControlData', () => {
  it('should keep valid JSON strings in data field as-is', () => {
    const input = {
      data: {
        data: '{"key":"value"}',
        other: 'plain string',
      },
      body: 'test',
    };

    const result = normalizeControlData(input) as any;

    expect(result.data.data).toBe('{"key":"value"}');
    expect(result.data.other).toBe('plain string');
    expect(result.body).toBe('test');
  });

  it('should repair invalid JSON strings with single quotes in data field', () => {
    const input = {
      data: {
        data: "{'key':'value'}",
        nested: "{'outer':{'inner':'value'}}",
      },
      body: "{'text':'hello'}",
      subject: "{'title':'test'}",
    };

    const result = normalizeControlData(input) as any;

    expect(result.data.data).toBe('{"key":"value"}');
    expect(result.data.nested).toBe('{"outer":{"inner":"value"}}');
    expect(result.body).toBe("{'text':'hello'}"); // Not normalized (not in data field)
    expect(result.subject).toBe("{'title':'test'}"); // Not normalized (not in data field)
  });

  it('should keep incomplete JSON-like strings in data field as-is', () => {
    const input = {
      data: {
        incomplete: '{123',
        justBrace: '{',
      },
    };

    const result = normalizeControlData(input) as any;

    expect(result.data.incomplete).toBe('{123');
    expect(result.data.justBrace).toBe('{');
  });

  it('should handle arrays in data field JSON strings', () => {
    const input = {
      data: {
        array: "['item1','item2']",
      },
    };

    const result = normalizeControlData(input) as any;

    expect(result.data.array).toBe('["item1","item2"]');
  });

  it('should keep strings that cannot be repaired in data field', () => {
    const input = {
      data: {
        unrepairable: '{invalid json that cannot be fixed',
      },
    };

    const result = normalizeControlData(input) as any;

    expect(result.data.unrepairable).toBe('{invalid json that cannot be fixed');
  });

  it('should handle controls without data field', () => {
    const input = {
      body: 'test',
      subject: 'hello',
    };

    const result = normalizeControlData(input);

    expect(result).toEqual(input);
  });

  it('should preserve non-string, non-object values in data field', () => {
    const input = {
      data: {
        number: 123,
        boolean: true,
        nullValue: null,
        array: [1, 2, 3],
      },
    };

    const result = normalizeControlData(input) as any;

    expect(result.data.number).toBe(123);
    expect(result.data.boolean).toBe(true);
    expect(result.data.nullValue).toBe(null);
    expect(result.data.array).toEqual([1, 2, 3]);
  });

  it('should handle empty data field', () => {
    const input = {
      data: {},
      body: 'test',
    };

    const result = normalizeControlData(input);

    expect(result.data).toEqual({});
    expect(result.body).toBe('test');
  });

  it('should handle data field that is an array', () => {
    const input = {
      data: [1, 2, 3],
      body: 'test',
    };

    const result = normalizeControlData(input);

    expect(result.data).toEqual([1, 2, 3]);
    expect(result.body).toBe('test');
  });

  it('should handle data field that is a string', () => {
    const input = {
      data: 'plain string',
      body: 'test',
    };

    const result = normalizeControlData(input);

    expect(result.data).toBe('plain string');
    expect(result.body).toBe('test');
  });

  it('expandJsonStringControlValues should wrap JSON-stringified objects and arrays', () => {
    const input = {
      body: '{"type":"doc","content":[{"type":"text","text":"hi"}]}',
      list: '["a","b"]',
      subject: 'plain text',
      url: 'https://example.com',
      bare: '{not actually json',
      empty: '{}',
    };

    const result = expandJsonStringControlValues(input) as Record<string, any>;

    expect(result.body[JSON_STRING_WRAPPER_KEY]).toBe(true);
    expect(result.body.value).toEqual({ type: 'doc', content: [{ type: 'text', text: 'hi' }] });
    expect(result.list[JSON_STRING_WRAPPER_KEY]).toBe(true);
    expect(result.list.value).toEqual(['a', 'b']);
    expect(result.subject).toBe('plain text');
    expect(result.url).toBe('https://example.com');
    expect(result.bare).toBe('{not actually json');
    expect(result.empty).toBe('{}'); // too short to be a meaningful JSON object
  });

  it('restoreJsonStringControlValues should re-stringify wrapped values', () => {
    const input = {
      body: {
        [JSON_STRING_WRAPPER_KEY]: true,
        value: { type: 'doc', content: [{ type: 'text', text: 'hi "there"' }] },
      },
      list: { [JSON_STRING_WRAPPER_KEY]: true, value: ['a', 'b'] },
      subject: 'plain text',
    };

    const result = restoreJsonStringControlValues(input) as Record<string, unknown>;

    expect(result.body).toBe('{"type":"doc","content":[{"type":"text","text":"hi \\"there\\""}]}');
    expect(result.list).toBe('["a","b"]');
    expect(result.subject).toBe('plain text');
  });

  it('expand + restore round-trip preserves JSON-stringified control values', () => {
    const input = {
      body: '{"type":"doc","content":[{"type":"text","text":"hi \\"there\\""}]}',
      subject: 'plain',
    };

    const expanded = expandJsonStringControlValues(input);
    const restored = restoreJsonStringControlValues(expanded) as Record<string, unknown>;

    expect(restored.body).toBe(input.body);
    expect(restored.subject).toBe(input.subject);
  });

  it('should repair JSON strings with single quotes inside string values (real-world scenario)', () => {
    // Simulates the case where Liquid renders {{payload.data}} which contains text
    // with apostrophes/single quotes inside string values
    const input = {
      data: {
        data: "{'user':{'name':'John O\\'Connor','message':\"Don't forget to check the user's profile\",'metadata':{'userId':'user-123','action':\"Click here to view John's profile\"}}}",
      },
    };

    const result = normalizeControlData(input) as any;

    // Should repair the outer single quotes to double quotes
    // The inner single quotes/apostrophes in the string values should be preserved
    const parsed = JSON.parse(result.data.data);
    expect(parsed.user.name).toBe("John O'Connor");
    expect(parsed.user.message).toBe("Don't forget to check the user's profile");
    expect(parsed.user.metadata.userId).toBe('user-123');
    expect(parsed.user.metadata.action).toBe("Click here to view John's profile");
  });
});

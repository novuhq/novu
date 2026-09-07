import { describe, expect, it } from 'vitest';
import { createMockObjectFromSchema } from './create-mock-object-from-schema';

describe('createMockObjectFromSchema', () => {
  it('should preserve falsy default values (0, false, null, empty string)', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        insured_value: { type: 'number' as const, default: 0 },
        is_return: { type: 'boolean' as const, default: false },
        insurance_policy_id: { type: ['number', 'null'] as any, default: null },
        empty_string: { type: 'string' as const, default: '' },
      },
    };

    const result = createMockObjectFromSchema(schema, 'payload');

    expect(result).toEqual({
      insured_value: 0,
      is_return: false,
      insurance_policy_id: null,
      empty_string: '',
    });
  });

  it('should generate template strings for properties without defaults', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const },
        age: { type: 'number' as const },
      },
    };

    const result = createMockObjectFromSchema(schema, 'payload');

    expect(result).toEqual({
      name: '{{payload.name}}',
      age: '{{payload.age}}',
    });
  });

  it('should preserve truthy default values', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        name: { type: 'string' as const, default: 'John' },
        count: { type: 'number' as const, default: 42 },
        active: { type: 'boolean' as const, default: true },
      },
    };

    const result = createMockObjectFromSchema(schema, 'payload');

    expect(result).toEqual({
      name: 'John',
      count: 42,
      active: true,
    });
  });

  it('should handle nested objects', () => {
    const schema = {
      type: 'object' as const,
      properties: {
        address: {
          type: 'object' as const,
          properties: {
            street: { type: 'string' as const },
            zip_code: { type: 'number' as const, default: 0 },
          },
        },
      },
    };

    const result = createMockObjectFromSchema(schema, 'payload');

    expect(result).toEqual({
      address: {
        street: '{{payload.address.street}}',
        zip_code: 0,
      },
    });
  });
});

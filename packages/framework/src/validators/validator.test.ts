import { describe, it, expect } from 'vitest';
import { validateData, transformSchema } from './base.validator';
import { ZodSchema, z } from 'zod';
import { JsonSchema } from '../types/schema.types';

const schemas = ['zod', 'json'] as const;

describe('validators', () => {
  describe('validateData', () => {
    type ValidateDataTestCase = {
      title: string;
      schemas: {
        zod: ZodSchema;
        json: JsonSchema;
      };
      payload: Record<string, any>;
      result: {
        success: boolean;
        data?: Record<string, any>;
        errors?: {
          zod: { message: string; path: string }[];
          json: { message: string; path: string }[];
        };
      };
    };
    const testCases: ValidateDataTestCase[] = [
      {
        title: 'should successfully validate data',
        schemas: {
          zod: z.object({ name: z.string() }),
          json: { type: 'object', properties: { name: { type: 'string' } } } as const,
        },
        payload: { name: 'John' },
        result: {
          success: true,
          data: { name: 'John' },
        },
      },
      {
        title: 'should remove additional properties and successfully validate',
        schemas: {
          zod: z.object({ name: z.string() }),
          json: { type: 'object', properties: { name: { type: 'string' } } } as const,
        },
        payload: { name: 'John', age: 30 },
        result: {
          success: true,
          data: { name: 'John' },
        },
      },
      {
        title: 'should return errors when given invalid types',
        schemas: {
          zod: z.object({ name: z.string() }),
          json: { type: 'object', properties: { name: { type: 'string' } } } as const,
        },
        payload: { name: 123 },
        result: {
          success: false,
          errors: {
            // TODO: error normalization
            json: [{ message: 'must be string', path: '/name' }],
            zod: [{ message: 'Expected string, received number', path: '/name' }],
          },
        },
      },
      {
        title: 'should validate nested properties successfully',
        schemas: {
          zod: z.object({ name: z.string(), nested: z.object({ age: z.number() }) }),
          json: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              nested: { type: 'object', properties: { age: { type: 'number' } } },
            },
          } as const,
        },
        payload: { name: 'John', nested: { age: 30 } },
        result: {
          success: true,
          data: { name: 'John', nested: { age: 30 } },
        },
      },
      {
        title: 'should return errors for invalid nested properties',
        schemas: {
          zod: z.object({ name: z.string(), nested: z.object({ age: z.number() }) }),
          json: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              nested: { type: 'object', properties: { age: { type: 'number' } } },
            },
          } as const,
        },
        payload: { name: 'John', nested: { age: '30' } },
        result: {
          success: false,
          errors: {
            zod: [{ message: 'Expected number, received string', path: '/nested/age' }],
            json: [{ message: 'must be number', path: '/nested/age' }],
          },
        },
      },
    ];

    schemas.forEach((schema) => {
      return describe(`using ${schema}`, () => {
        testCases.forEach((testCase) => {
          it(testCase.title, async () => {
            const result = await validateData(testCase.schemas[schema], testCase.payload);
            expect(result).toEqual({
              success: testCase.result.success,
              data: testCase.result.data,
              errors: testCase.result.errors?.[schema],
            });
          });
        });
      });
    });

    it('should throw an error for invalid schema', async () => {
      const schema = { invalidKey: 'test' } as const;

      // @ts-expect-error - we are testing the type guard
      await expect(validateData(schema, {})).rejects.toThrow('Invalid schema');
    });
  });

  describe('transformSchema', () => {
    type TransformSchemaTestCase = {
      title: string;
      schema: {
        zod: ZodSchema;
        json: JsonSchema;
      };
      result: JsonSchema;
    };
    const testCases: TransformSchemaTestCase[] = [
      {
        title: 'should transform a simple object schema',
        schema: {
          zod: z.object({ name: z.string(), age: z.number() }),
          json: {
            type: 'object',
            properties: { name: { type: 'string' }, age: { type: 'number' } },
            required: ['name', 'age'],
            additionalProperties: false,
          } as const,
        },
        result: {
          type: 'object',
          properties: { name: { type: 'string' }, age: { type: 'number' } },
          required: ['name', 'age'],
          additionalProperties: false,
        },
      },
      {
        title: 'should transform a nested object schema',
        schema: {
          zod: z.object({ name: z.string(), nested: z.object({ age: z.number() }) }),
          json: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              nested: {
                type: 'object',
                properties: { age: { type: 'number' } },
                required: ['age'],
                additionalProperties: false,
              },
            },
            required: ['name', 'nested'],
            additionalProperties: false,
          } as const,
        },
        result: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            nested: {
              type: 'object',
              properties: { age: { type: 'number' } },
              required: ['age'],
              additionalProperties: false,
            },
          },
          required: ['name', 'nested'],
          additionalProperties: false,
        },
      },
    ];

    schemas.forEach((schema) => {
      return describe(`using ${schema}`, () => {
        testCases.forEach((testCase) => {
          it(testCase.title, () => {
            const result = transformSchema(testCase.schema[schema]);
            expect(result).deep.contains(testCase.result);
          });
        });
      });
    });

    it('should throw an error for invalid schema', () => {
      const schema = { invalidKey: 'test' } as const;

      // @ts-expect-error - we are testing the type guard
      expect(() => transformSchema(schema)).toThrow('Invalid schema');
    });
  });
});

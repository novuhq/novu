import { describe, it, expect } from 'vitest';
import { validateData, transformSchema } from './base.validator';
import { ZodSchema, z } from 'zod';
import { FromSchema, JsonSchema } from '../types/schema.types';

const schemas = ['zod', 'json'] as const;

describe('validators', () => {
  describe('validateData', () => {
    type ValidateDataTestCase = {
      title: string;
      schemas: {
        zod: ZodSchema;
        json: JsonSchema;
      };
      payload: Record<string, unknown>;
      result: {
        success: boolean;
        data?: Record<string, unknown>;
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
          json: { type: 'object', properties: { name: { type: 'string' } }, additionalProperties: false } as const,
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
      {
        title: 'should successfully validate polymorphic properties',
        schemas: {
          zod: z.object({
            elements: z.array(
              z.discriminatedUnion('type', [
                z.object({ type: z.literal('stringType'), stringVal: z.string() }),
                z.object({ type: z.literal('numberType'), numVal: z.number() }),
                z.object({ type: z.literal('booleanType'), boolVal: z.boolean() }),
              ])
            ),
          }),
          json: {
            type: 'object',
            properties: {
              elements: {
                type: 'array',
                items: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: { type: { type: 'string', const: 'stringType' }, stringVal: { type: 'string' } },
                      additionalProperties: false,
                      required: ['type', 'stringVal'],
                    },
                    {
                      type: 'object',
                      properties: { type: { type: 'string', const: 'numberType' }, numVal: { type: 'number' } },
                      additionalProperties: false,
                      required: ['type', 'numVal'],
                    },
                    {
                      type: 'object',
                      properties: { type: { type: 'string', const: 'booleanType' }, boolVal: { type: 'boolean' } },
                      additionalProperties: false,
                      required: ['type', 'boolVal'],
                    },
                  ],
                },
              },
            },
            additionalProperties: false,
            required: ['elements'],
          } as const,
        },
        payload: {
          elements: [
            { type: 'stringType', stringVal: '123' },
            { type: 'numberType', numVal: 123, extra: 'shouldBeRemoved' },
            { type: 'booleanType', boolVal: true },
          ],
        },
        result: {
          success: true,
          data: {
            elements: [
              { type: 'stringType', stringVal: '123' },
              { type: 'numberType', numVal: 123 },
              { type: 'booleanType', boolVal: true },
            ],
          },
        },
      },
      {
        title: 'should return errors for invalid polymorphic properties',
        schemas: {
          zod: z.object({
            elements: z.array(
              z.discriminatedUnion('type', [
                z.object({ type: z.literal('stringType'), stringVal: z.string() }),
                z.object({ type: z.literal('numberType'), numVal: z.number() }),
                z.object({ type: z.literal('booleanType'), boolVal: z.boolean() }),
              ])
            ),
          }),
          json: {
            type: 'object',
            properties: {
              elements: {
                type: 'array',
                items: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: { type: { type: 'string', const: 'stringType' }, stringVal: { type: 'string' } },
                      additionalProperties: false,
                      required: ['type', 'stringVal'],
                    },
                    {
                      type: 'object',
                      properties: { type: { type: 'string', const: 'numberType' }, numVal: { type: 'number' } },
                      additionalProperties: false,
                      required: ['type', 'numVal'],
                    },
                    {
                      type: 'object',
                      properties: { type: { type: 'string', const: 'booleanType' }, boolVal: { type: 'boolean' } },
                      additionalProperties: false,
                      required: ['type', 'boolVal'],
                    },
                  ],
                },
              },
            },
            additionalProperties: false,
            required: ['elements'],
          } as const,
        },
        payload: {
          elements: [
            { type: 'stringType', stringVal: '123' },
            { type: 'numberType', numVal: '123' },
            { type: 'booleanType', boolVal: true },
          ],
        },
        result: {
          success: false,
          errors: {
            zod: [{ message: 'Expected number, received string', path: '/elements/1/numVal' }],
            /*
             * TODO: use discriminator to get the correct error message.
             *
             * The `discriminator` property is only supported in OpenAPI 3.1.
             * https://swagger.io/docs/specification/data-models/inheritance-and-polymorphism/
             *
             * Ajv has added limited support for the `discriminator` keyword, however because it isn't
             * yet part of the JSON Schema standard, we can't rely on it.
             *
             * When using `discriminator`, the error message can be reduced to:
             * { message: 'must be number', path: '/elements/1/numVal' },
             *
             * @see https://ajv.js.org/json-schema.html#discriminator
             */
            json: [
              {
                message: "must have required property 'stringVal'",
                path: '/elements/1',
              },
              { message: 'must be number', path: '/elements/1/numVal' },
              {
                message: "must have required property 'boolVal'",
                path: '/elements/1',
              },
              {
                message: 'must match a schema in anyOf',
                path: '/elements/1',
              },
            ],
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
      schemas: {
        zod: ZodSchema;
        json: JsonSchema;
      };
      result: JsonSchema;
    };
    const testCases: TransformSchemaTestCase[] = [
      {
        title: 'should transform a simple object schema',
        schemas: {
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
        schemas: {
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
      {
        title: 'should transform a polymorphic object schema',
        schemas: {
          zod: z.object({
            elements: z.array(
              z.discriminatedUnion('type', [
                z.object({ type: z.literal('stringType'), stringVal: z.string() }),
                z.object({ type: z.literal('numberType'), numVal: z.number() }),
                z.object({ type: z.literal('booleanType'), boolVal: z.boolean() }),
              ])
            ),
          }),
          json: {
            type: 'object',
            properties: {
              elements: {
                type: 'array',
                items: {
                  anyOf: [
                    {
                      type: 'object',
                      properties: { type: { type: 'string', const: 'stringType' }, stringVal: { type: 'string' } },
                      additionalProperties: false,
                      required: ['type', 'stringVal'],
                    },
                    {
                      type: 'object',
                      properties: { type: { type: 'string', const: 'numberType' }, numVal: { type: 'number' } },
                      additionalProperties: false,
                      required: ['type', 'numVal'],
                    },
                    {
                      type: 'object',
                      properties: { type: { type: 'string', const: 'booleanType' }, boolVal: { type: 'boolean' } },
                      additionalProperties: false,
                      required: ['type', 'boolVal'],
                    },
                  ],
                },
              },
            },
            additionalProperties: false,
            required: ['elements'],
          } as const,
        },
        result: {
          type: 'object',
          properties: {
            elements: {
              type: 'array',
              items: {
                anyOf: [
                  {
                    type: 'object',
                    properties: { type: { type: 'string', const: 'stringType' }, stringVal: { type: 'string' } },
                    additionalProperties: false,
                    required: ['type', 'stringVal'],
                  },
                  {
                    type: 'object',
                    properties: { type: { type: 'string', const: 'numberType' }, numVal: { type: 'number' } },
                    additionalProperties: false,
                    required: ['type', 'numVal'],
                  },
                  {
                    type: 'object',
                    properties: { type: { type: 'string', const: 'booleanType' }, boolVal: { type: 'boolean' } },
                    additionalProperties: false,
                    required: ['type', 'boolVal'],
                  },
                ],
              },
            },
          },
          additionalProperties: false,
          required: ['elements'],
        },
      },
    ];

    schemas.forEach((schema) => {
      return describe(`using ${schema}`, () => {
        testCases.forEach((testCase) => {
          it(testCase.title, () => {
            const result = transformSchema(testCase.schemas[schema]);
            expect(result).toMatchInlineSnapshot(testCase.result);
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

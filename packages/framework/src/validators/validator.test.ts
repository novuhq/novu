import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { validateData, transformSchema } from './base.validator';
import { Schema, ZodSchema, JsonSchema } from '../types/schema.types';

const schemas = ['zod', 'json'] as const;

describe('validators', () => {
  describe('validateData', () => {
    type ValidateDataTestCase = {
      title: string;
      schemas: {
        zod: ZodSchema | null;
        json: JsonSchema;
      };
      payload: Record<string, unknown>;
      result: {
        success: boolean;
        data?: Record<string, unknown>;
        errors?: {
          zod: { message: string; path: string }[] | null;
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
        title: 'should successfully validate a polymorphic oneOf schema',
        schemas: {
          zod: null, // Zod has no support for `oneOf`
          json: {
            oneOf: [
              { type: 'object', properties: { stringType: { type: 'string' } }, required: ['stringType'] },
              { type: 'object', properties: { numberType: { type: 'number' } }, required: ['numberType'] },
              { type: 'object', properties: { booleanType: { type: 'boolean' } }, required: ['booleanType'] },
            ],
          } as const,
        },
        payload: {
          stringType: '123',
        },
        result: {
          success: true,
          data: {
            stringType: '123',
          },
        },
      },
      {
        title: 'should return errors for invalid polymorphic oneOf schema',
        schemas: {
          zod: null, // Zod has no support for `oneOf`
          json: {
            oneOf: [
              { type: 'object', properties: { stringType: { type: 'string' } }, required: ['stringType'] },
              { type: 'object', properties: { numberType: { type: 'number' } }, required: ['numberType'] },
              { type: 'object', properties: { booleanType: { type: 'boolean' } }, required: ['booleanType'] },
            ],
          } as const,
        },
        payload: {
          stringType: '123',
          numberType: 123,
        },
        result: {
          success: false,
          errors: {
            json: [{ message: 'must match exactly one schema in oneOf', path: '' }],
            zod: null, // Zod has no support for `oneOf`
          },
        },
      },
      {
        title: 'should successfully validate a polymorphic allOf schema',
        schemas: {
          zod: null, // Zod has no support for `oneOf`
          json: {
            allOf: [
              { type: 'object', properties: { stringType: { type: 'string' } }, required: ['stringType'] },
              { type: 'object', properties: { numberType: { type: 'number' } }, required: ['numberType'] },
              { type: 'object', properties: { booleanType: { type: 'boolean' } }, required: ['booleanType'] },
            ],
          } as const,
        },
        payload: {
          stringType: '123',
          numberType: 123,
          booleanType: true,
        },
        result: {
          success: true,
          data: {
            stringType: '123',
            numberType: 123,
            booleanType: true,
          },
        },
      },
      {
        title: 'should return errors for invalid polymorphic `allOf` schema',
        schemas: {
          zod: null, // Zod has no support for `allOf`
          json: {
            allOf: [
              { type: 'object', properties: { stringType: { type: 'string' } }, required: ['stringType'] },
              { type: 'object', properties: { numberType: { type: 'number' } }, required: ['numberType'] },
              { type: 'object', properties: { booleanType: { type: 'boolean' } }, required: ['booleanType'] },
            ],
          } as const,
        },
        payload: {
          stringType: '123',
        },
        result: {
          success: false,
          errors: {
            json: [{ message: "must have required property 'numberType'", path: '' }],
            zod: null, // Zod has no support for `allOf`
          },
        },
      },
      {
        title: 'should successfully validate polymorphic `anyOf` properties',
        schemas: {
          zod: z.discriminatedUnion('type', [
            z.object({ type: z.literal('stringType'), stringVal: z.string() }),
            z.object({ type: z.literal('numberType'), numVal: z.number() }),
            z.object({ type: z.literal('booleanType'), boolVal: z.boolean() }),
          ]),
          json: {
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
          } as const,
        },
        payload: { type: 'stringType', stringVal: '123' },
        result: {
          success: true,
          data: { type: 'stringType', stringVal: '123' },
        },
      },
      {
        title: 'should return errors for invalid polymorphic `anyOf` properties',
        schemas: {
          zod: z.discriminatedUnion('type', [
            z.object({ type: z.literal('stringType'), stringVal: z.string() }),
            z.object({ type: z.literal('numberType'), numVal: z.number() }),
            z.object({ type: z.literal('booleanType'), boolVal: z.boolean() }),
          ]),
          json: {
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
          } as const,
        },
        payload: { type: 'numberType', numVal: '123' },
        result: {
          success: false,
          errors: {
            zod: [{ message: 'Expected number, received string', path: '/numVal' }],
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
                path: '',
              },
              {
                message: 'must be number',
                path: '/numVal',
              },
              {
                message: "must have required property 'boolVal'",
                path: '',
              },
              {
                message: 'must match a schema in anyOf',
                path: '',
              },
            ],
          },
        },
      },
    ];

    schemas.forEach((schema) => {
      return describe(`using ${schema}`, () => {
        testCases
          .filter((testCase) => testCase.schemas[schema] !== null)
          .forEach((testCase) => {
            it(testCase.title, async () => {
              const result = await validateData(testCase.schemas[schema] as Schema, testCase.payload);
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
        zod: ZodSchema | null;
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
        title: 'should transform a polymorphic `oneOf` schema',
        schemas: {
          zod: null, // Zod has no support for `oneOf`
          json: {
            oneOf: [
              { type: 'object', properties: { stringType: { type: 'string' } }, required: ['stringType'] },
              { type: 'object', properties: { numberType: { type: 'string' } }, required: ['numberType'] },
              { type: 'object', properties: { booleanType: { type: 'string' } }, required: ['booleanType'] },
            ],
          } as const,
        },
        result: {
          oneOf: [
            { type: 'object', properties: { stringType: { type: 'string' } }, required: ['stringType'] },
            { type: 'object', properties: { numberType: { type: 'string' } }, required: ['numberType'] },
            { type: 'object', properties: { booleanType: { type: 'string' } }, required: ['booleanType'] },
          ],
        },
      },
      {
        title: 'should transform a polymorphic `allOf` schema',
        schemas: {
          zod: null, // Zod has no support for `anyOf`
          json: {
            allOf: [
              { type: 'object', properties: { stringType: { type: 'string' } }, required: ['stringType'] },
              { type: 'object', properties: { numberType: { type: 'string' } }, required: ['numberType'] },
              { type: 'object', properties: { booleanType: { type: 'string' } }, required: ['booleanType'] },
            ],
          } as const,
        },
        result: {
          allOf: [
            { type: 'object', properties: { stringType: { type: 'string' } }, required: ['stringType'] },
            { type: 'object', properties: { numberType: { type: 'string' } }, required: ['numberType'] },
            { type: 'object', properties: { booleanType: { type: 'string' } }, required: ['booleanType'] },
          ],
        },
      },
      {
        title: 'should transform a polymorphic `anyOf` schema',
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
        testCases
          .filter((testCase) => testCase.schemas[schema] !== null)
          .forEach((testCase) => {
            it(testCase.title, async () => {
              const result = await transformSchema(testCase.schemas[schema] as Schema);
              expect(result).deep.contain(testCase.result);
            });
          });
      });
    });

    it('should throw an error for invalid schema', async () => {
      const schema = { invalidKey: 'test' } as const;

      // @ts-expect-error - we are testing the type guard
      await expect(transformSchema(schema)).rejects.toThrow('Invalid schema');
    });
  });
});

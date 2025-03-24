import { describe, expectTypeOf } from 'vitest';
import { workflow } from '.';
import { Subscriber } from '../../types';

describe('workflow function types', () => {
  describe('event types', () => {
    it('should have the expected subscriber type', () => {
      workflow('without-schema', async ({ subscriber }) => {
        expectTypeOf(subscriber).toEqualTypeOf<Subscriber>();
      });
    });

    it('should have the expected step functions', () => {
      workflow('without-schema', async ({ step }) => {
        expectTypeOf(step).toMatchTypeOf<{
          email: unknown;
          sms: unknown;
          push: unknown;
          chat: unknown;
          inApp: unknown;
          digest: unknown;
          delay: unknown;
          custom: unknown;
        }>();
      });
    });
  });

  describe('without schema', () => {
    it('should infer an unknown record type in the step controls', async () => {
      workflow('without-schema', async ({ step }) => {
        await step.email(
          'without-schema',
          async (controls) => {
            expectTypeOf(controls).toEqualTypeOf<Record<string, unknown>>();

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          },
          {
            skip: (controls) => {
              expectTypeOf(controls).toEqualTypeOf<Record<string, unknown>>();

              return true;
            },
            providers: {
              sendgrid: async ({ controls }) => {
                expectTypeOf(controls).toEqualTypeOf<Record<string, unknown>>();

                return {
                  ipPoolName: 'test',
                };
              },
            },
          }
        );
      });
    });

    it('should infer an unknown record type in the workflow event payload', async () => {
      workflow('without-schema', async ({ step, payload }) => {
        await step.email('without-schema', async () => {
          expectTypeOf(payload).toEqualTypeOf<Record<string, unknown>>();

          return {
            subject: 'Test subject',
            body: 'Test body',
          };
        });
      });
    });

    it('should infer an unknown record type in the workflow event controls', async () => {
      workflow('without-schema', async ({ step, controls }) => {
        await step.email('without-schema', async () => {
          expectTypeOf(controls).toEqualTypeOf<Record<string, unknown>>();

          return {
            subject: 'Test subject',
            body: 'Test body',
          };
        });
      });
    });

    it('should infer an unknown record type in the custom step results', async () => {
      workflow('without-schema', async ({ step }) => {
        const result = await step.custom('without-schema', async () => {
          return {
            foo: 'bar',
          };
        });

        expectTypeOf(result).toMatchTypeOf<Record<string, unknown>>();
      });
    });
  });

  describe('json-schema', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        foo: { type: 'string' },
        baz: { type: 'number' },
      },
      required: ['foo'],
      additionalProperties: false,
    } as const;

    it('should infer an unknown record type when the provided schema is for a primitive type', () => {
      const primitiveSchema = { type: 'string' } as const;
      workflow('without-schema', async ({ step }) => {
        await step.email(
          'without-schema',
          async (controls) => {
            expectTypeOf(controls).toEqualTypeOf<Record<string, unknown>>();

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          },
          {
            // @ts-expect-error - schema is for a primitive type
            controlSchema: primitiveSchema,
          }
        );
      });
    });

    it('should infer correct types in the step controls', async () => {
      workflow('json-schema', async ({ step }) => {
        await step.email(
          'json-schema',
          async (controls) => {
            expectTypeOf(controls).toEqualTypeOf<{ foo: string; baz?: number }>();

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          },
          {
            controlSchema: jsonSchema,
            skip: (controls) => {
              expectTypeOf(controls).toEqualTypeOf<{ foo: string; baz?: number }>();

              return true;
            },
            providers: {
              sendgrid: async ({ controls }) => {
                expectTypeOf(controls).toEqualTypeOf<{ foo: string; baz?: number }>();

                return {
                  ipPoolName: 'test',
                };
              },
            },
          }
        );
      });

      it('should infer correct types in the workflow event payload', async () => {
        workflow(
          'json-schema-validation',
          async ({ step, payload }) => {
            await step.email('json-schema-validation', async () => {
              expectTypeOf(payload).toEqualTypeOf<{ foo: string; baz?: number }>();

              return {
                subject: 'Test subject',
                body: 'Test body',
              };
            });
          },
          {
            payloadSchema: jsonSchema,
          }
        );
      });

      it('should infer correct types in the workflow event controls', async () => {
        workflow(
          'json-schema-validation',
          async ({ step, controls }) => {
            await step.email('json-schema-validation', async () => {
              expectTypeOf(controls).toEqualTypeOf<{ foo: string; baz?: number }>();

              return {
                subject: 'Test subject',
                body: 'Test body',
              };
            });
          },
          {
            controlSchema: jsonSchema,
          }
        );
      });

      it('should infer correct types in the workflow event controls', async () => {
        workflow(
          'json-schema-validation',
          async ({ step, controls }) => {
            await step.email('json-schema-validation', async () => {
              expectTypeOf(controls).toEqualTypeOf<{ foo: string; baz?: number }>();

              return {
                subject: 'Test subject',
                body: 'Test body',
              };
            });
          },
          {
            controlSchema: jsonSchema,
          }
        );
      });

      it('should infer the correct types in the custom step results', async () => {
        workflow('without-schema', async ({ step }) => {
          const result = await step.custom(
            'without-schema',
            async () => {
              return {
                foo: 'bar',
              };
            },
            {
              outputSchema: jsonSchema,
            }
          );

          expectTypeOf(result).toMatchTypeOf<{ foo: string; baz?: number }>();
        });
      });
    });
  });
});

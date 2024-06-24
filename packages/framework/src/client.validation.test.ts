import { expect, it, describe, beforeEach } from 'vitest';
import { Client } from './client';
import { z } from 'zod';
import { workflow } from './workflow';
import { ExecutionStateInputInvalidError } from './errors';

describe('validation', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client();
  });

  describe('zod', () => {
    const zodSchema = z.object({
      foo: z.string(),
      baz: z.number(),
    });

    it('should infer types in the step inputs', async () => {
      workflow('zod-validation', async ({ step }) => {
        await step.email(
          'zod-validation',
          async (inputs) => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            inputs.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            inputs.baz = '123';

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          },
          {
            inputSchema: zodSchema,
            skip: (inputs) => {
              // @ts-expect-error - Type 'number' is not assignable to type 'string'.
              inputs.foo = 123;
              // @ts-expect-error - Type 'string' is not assignable to type 'number'.
              inputs.baz = '123';

              return true;
            },
            providers: {
              sendgrid: async ({ inputs }) => {
                // @ts-expect-error - Type 'number' is not assignable to type 'string'.
                inputs.foo = 123;
                // @ts-expect-error - Type 'string' is not assignable to type 'number'.
                inputs.baz = '123';

                return {
                  ipPoolName: 'test',
                };
              },
            },
          }
        );
      });
    });

    it('should infer types in the workflow payload', async () => {
      workflow(
        'zod-validation',
        async ({ step, payload }) => {
          await step.email('zod-validation', async () => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            payload.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            payload.baz = '123';

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          });
        },
        {
          payloadSchema: z.object({
            foo: z.string(),
            baz: z.number(),
          }),
        }
      );
    });

    it('should infer types in the workflow inputs', async () => {
      workflow(
        'zod-validation',
        async ({ step, input }) => {
          await step.email('zod-validation', async () => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            input.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            input.baz = '123';

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          });
        },
        {
          inputSchema: z.object({
            foo: z.string(),
            baz: z.number(),
          }),
        }
      );
    });

    it('should transform a zod schema to a json schema during discovery', async () => {
      client.addWorkflows([
        workflow('zod-validation', async ({ step }) => {
          await step.email(
            'zod-validation',
            async (inputs) => ({
              subject: 'Test subject',
              body: 'Test body',
            }),
            {
              inputSchema: zodSchema,
            }
          );
        }),
      ]);

      const discoverResult = client.discover();
      const stepInputSchema = discoverResult.workflows[0].steps[0].inputs.schema;

      expect(stepInputSchema).to.deep.include({
        additionalProperties: false,
        properties: {
          foo: {
            type: 'string',
          },
          baz: {
            type: 'number',
          },
        },
        required: ['foo', 'baz'],
        type: 'object',
      });
    });

    it('should throw an error if a property is missing', async () => {
      client.addWorkflows([
        workflow('zod-validation', async ({ step }) => {
          await step.email(
            'test-email',
            async (inputs) => ({
              subject: 'Test subject',
              body: 'Test body',
            }),
            {
              inputSchema: zodSchema,
            }
          );
        }),
      ]);

      try {
        await client.executeWorkflow({
          action: 'execute',
          workflowId: 'zod-validation',
          inputs: {
            foo: '341',
          },
          data: {},
          stepId: 'test-email',
          state: [],
          subscriber: {},
        });
      } catch (error) {
        expect(error).to.be.instanceOf(ExecutionStateInputInvalidError);
        expect((error as ExecutionStateInputInvalidError).message).to.equal(
          'Workflow with id: `zod-validation` has an invalid state. Step with id: `test-email` has invalid input. Please provide the correct step input.'
        );
        expect((error as ExecutionStateInputInvalidError).data).to.deep.equal([
          {
            message: 'Required',
            path: '/baz',
          },
        ]);
      }
    });
  });

  describe('json-schema', () => {
    const jsonSchema = {
      type: 'object',
      properties: {
        foo: { type: 'string' },
        baz: { type: 'number' },
      },
      required: ['foo', 'baz'],
      additionalProperties: false,
    } as const;

    it('should infer types in the step inputs', async () => {
      workflow('json-schema-validation', async ({ step }) => {
        await step.email(
          'json-schema-validation',
          async (inputs) => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            inputs.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            inputs.baz = '123';

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          },
          {
            inputSchema: jsonSchema,
            skip: (inputs) => {
              // @ts-expect-error - Type 'number' is not assignable to type 'string'.
              inputs.foo = 123;
              // @ts-expect-error - Type 'string' is not assignable to type 'number'.
              inputs.baz = '123';

              return true;
            },
            providers: {
              sendgrid: async ({ inputs }) => {
                // @ts-expect-error - Type 'number' is not assignable to type 'string'.
                inputs.foo = 123;
                // @ts-expect-error - Type 'string' is not assignable to type 'number'.
                inputs.baz = '123';

                return {
                  ipPoolName: 'test',
                };
              },
            },
          }
        );
      });
    });

    it('should infer types in the workflow payload', async () => {
      workflow(
        'json-schema-validation',
        async ({ step, payload }) => {
          await step.email('json-schema-validation', async () => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            payload.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            payload.baz = '123';

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

    it('should infer types in the workflow inputs', async () => {
      workflow(
        'json-schema-validation',
        async ({ step, input }) => {
          await step.email('json-schema-validation', async () => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            input.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            input.baz = '123';

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          });
        },
        {
          inputSchema: jsonSchema,
        }
      );
    });

    it('should transform a JSON schema to a valid schema during discovery', async () => {
      client.addWorkflows([
        workflow('json-schema-validation', async ({ step }) => {
          await step.email(
            'json-schema-validation',
            async (inputs) => ({
              subject: 'Test subject',
              body: 'Test body',
            }),
            {
              inputSchema: jsonSchema,
            }
          );
        }),
      ]);

      const discoverResult = client.discover();
      const stepInputSchema = discoverResult.workflows[0].steps[0].inputs.schema;

      expect(stepInputSchema).to.deep.include({
        additionalProperties: false,
        properties: {
          foo: {
            type: 'string',
          },
          baz: {
            type: 'number',
          },
        },
        required: ['foo', 'baz'],
        type: 'object',
      });
    });

    it('should throw an error if a property is missing', async () => {
      client.addWorkflows([
        workflow('json-schema-validation', async ({ step }) => {
          await step.email(
            'test-email',
            async (inputs) => ({
              subject: 'Test subject',
              body: 'Test body',
            }),
            {
              inputSchema: jsonSchema,
            }
          );
        }),
      ]);

      try {
        await client.executeWorkflow({
          action: 'execute',
          workflowId: 'json-schema-validation',
          inputs: {
            foo: '341',
          },
          data: {},
          stepId: 'test-email',
          state: [],
          subscriber: {},
        });
      } catch (error) {
        expect(error).to.be.instanceOf(ExecutionStateInputInvalidError);
        expect((error as ExecutionStateInputInvalidError).message).to.equal(
          'Workflow with id: `json-schema-validation` has an invalid state. Step with id: `test-email` has invalid input. Please provide the correct step input.'
        );
        expect((error as ExecutionStateInputInvalidError).data).to.deep.equal([
          {
            message: "must have required property 'baz'",
            path: '',
          },
        ]);
      }
    });
  });
});

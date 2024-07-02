import { expect, it, describe, beforeEach } from 'vitest';
import { Client } from './client';
import { z } from 'zod';
import { workflow } from './workflow';
import { ExecutionStateControlsInvalidError } from './errors';

describe('validation', () => {
  let client: Client;

  beforeEach(() => {
    client = new Client({ secretKey: 'some-secret-key' });
  });

  describe('zod', () => {
    const zodSchema = z.object({
      foo: z.string(),
      baz: z.number(),
    });

    it('should infer types in the step controls', async () => {
      workflow('zod-validation', async ({ step }) => {
        await step.email(
          'zod-validation',
          async (controls) => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            controls.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            controls.baz = '123';

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          },
          {
            controlSchema: zodSchema,
            skip: (controls) => {
              // @ts-expect-error - Type 'number' is not assignable to type 'string'.
              controls.foo = 123;
              // @ts-expect-error - Type 'string' is not assignable to type 'number'.
              controls.baz = '123';

              return true;
            },
            providers: {
              sendgrid: async ({ controls, outputs }) => {
                // @ts-expect-error - Type 'number' is not assignable to type 'string'.
                controls.foo = 123;
                // @ts-expect-error - Type 'string' is not assignable to type 'number'.
                controls.baz = '123';

                // @ts-expect-error - Type 'number' is not assignable to type 'string'.
                outputs.body = 123;
                // @ts-expect-error - Type 'number' is not assignable to type 'string'.
                outputs.subject = 123;

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
          payloadSchema: zodSchema,
        }
      );
    });

    it('should infer types in the workflow controls', async () => {
      workflow(
        'zod-validation',
        async ({ step, controls }) => {
          await step.email('zod-validation', async () => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            controls.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            controls.baz = '123';

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          });
        },
        {
          controlSchema: zodSchema,
        }
      );
    });

    it('should transform a zod schema to a json schema during discovery', async () => {
      client.addWorkflows([
        workflow('zod-validation', async ({ step }) => {
          await step.email(
            'zod-validation',
            async (controls) => ({
              subject: 'Test subject',
              body: 'Test body',
            }),
            {
              controlSchema: zodSchema,
            }
          );
        }),
      ]);

      const discoverResult = client.discover();
      const stepControlSchema = discoverResult.workflows[0].steps[0].controls.schema;

      expect(stepControlSchema).to.deep.include({
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
            async (controls) => ({
              subject: 'Test subject',
              body: 'Test body',
            }),
            {
              controlSchema: zodSchema,
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
          controls: {
            foo: '341',
          },
          data: {},
          payload: {},
          stepId: 'test-email',
          state: [],
          subscriber: {},
        });
      } catch (error) {
        expect(error).to.be.instanceOf(ExecutionStateControlsInvalidError);
        expect((error as ExecutionStateControlsInvalidError).message).to.equal(
          'Workflow with id: `zod-validation` has an invalid state. Step with id: `test-email` has invalid `controls`. Please provide the correct step controls.'
        );
        expect((error as ExecutionStateControlsInvalidError).data).to.deep.equal([
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

    it('should infer types in the step controls', async () => {
      workflow('json-schema-validation', async ({ step }) => {
        await step.email(
          'json-schema-validation',
          async (controls) => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            controls.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            controls.baz = '123';

            return {
              subject: 'Test subject',
              body: 'Test body',
            };
          },
          {
            controlSchema: jsonSchema,
            skip: (controls) => {
              // @ts-expect-error - Type 'number' is not assignable to type 'string'.
              controls.foo = 123;
              // @ts-expect-error - Type 'string' is not assignable to type 'number'.
              controls.baz = '123';

              return true;
            },
            providers: {
              sendgrid: async ({ controls, outputs }) => {
                // @ts-expect-error - Type 'number' is not assignable to type 'string'.
                controls.foo = 123;
                // @ts-expect-error - Type 'string' is not assignable to type 'number'.
                controls.baz = '123';

                // @ts-expect-error - Type 'number' is not assignable to type 'string'.
                outputs.body = 123;
                // @ts-expect-error - Type 'number' is not assignable to type 'string'.
                outputs.subject = 123;

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

    it('should infer types in the workflow controls', async () => {
      workflow(
        'json-schema-validation',
        async ({ step, controls }) => {
          await step.email('json-schema-validation', async () => {
            // @ts-expect-error - Type 'number' is not assignable to type 'string'.
            controls.foo = 123;
            // @ts-expect-error - Type 'string' is not assignable to type 'number'.
            controls.baz = '123';

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

    it('should transform a JSON schema to a valid schema during discovery', async () => {
      client.addWorkflows([
        workflow('json-schema-validation', async ({ step }) => {
          await step.email(
            'json-schema-validation',
            async (controls) => ({
              subject: 'Test subject',
              body: 'Test body',
            }),
            {
              controlSchema: jsonSchema,
            }
          );
        }),
      ]);

      const discoverResult = client.discover();
      const stepControlSchema = discoverResult.workflows[0].steps[0].controls.schema;

      expect(stepControlSchema).to.deep.include({
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
            async (controls) => ({
              subject: 'Test subject',
              body: 'Test body',
            }),
            {
              controlSchema: jsonSchema,
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
          controls: {
            foo: '341',
          },
          data: {},
          payload: {},
          stepId: 'test-email',
          state: [],
          subscriber: {},
        });
      } catch (error) {
        expect(error).to.be.instanceOf(ExecutionStateControlsInvalidError);
        expect((error as ExecutionStateControlsInvalidError).message).to.equal(
          'Workflow with id: `json-schema-validation` has an invalid state. Step with id: `test-email` has invalid `controls`. Please provide the correct step controls.'
        );
        expect((error as ExecutionStateControlsInvalidError).data).to.deep.equal([
          {
            message: "must have required property 'baz'",
            path: '',
          },
        ]);
      }
    });
  });
});

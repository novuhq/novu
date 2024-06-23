import { expect, it, describe, beforeEach } from 'vitest';
import { Client } from './client';
import { z } from 'zod';
import { workflow } from './workflow';
import { ExecutionEventDataInvalidError, ExecutionStateInputInvalidError } from './errors';

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
        workflow(
          'zod-validation',
          async ({ step }) => {
            await step.email('test-email', async (inputs) => ({
              subject: 'Test subject',
              body: 'Test body',
            }));
          },
          {
            inputSchema: zodSchema,
          }
        ),
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
        expect((error as ExecutionStateInputInvalidError).data).to.deep.equal({
          foo: '341',
        });
      }
    });
  });
});

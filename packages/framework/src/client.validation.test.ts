import { expect, it, describe, beforeEach } from 'vitest';
import { Client } from './client';
import { z } from 'zod';
import { workflow } from './workflow';

describe('validation', () => {
  let client: Client;
  beforeEach(() => {
    client = new Client();
  });
  describe('zod', () => {
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
              inputSchema: z.object({
                foo: z.string(),
                baz: z.number(),
              }),
            }
          );
        }),
      ]);

      const discoverResult = client.discover();
      const stepInputSchema = discoverResult.workflows[0].steps[0].inputs.schema;

      expect(stepInputSchema).to.deep.include({
        additionalProperties: false,
        properties: {
          baz: {
            type: 'number',
          },
          foo: {
            type: 'string',
          },
        },
        required: ['foo', 'baz'],
        type: 'object',
      });
    });

    it('should throw an error if the input is invalid', async () => {
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
            inputSchema: z.object({
              foo: z.string(),
              baz: z.string(),
            }),
          }
        ),
      ]);

      await expect(
        client.executeWorkflow({
          action: 'execute',
          workflowId: 'zod-validation',
          inputs: {
            foo: 341,
          },
          data: {},
          stepId: 'test-email',
          state: [],
          subscriber: {},
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Workflow with id: \`zod-validation\` has an invalid state. Step with id: \`test-email\` has invalid input. Please provide the correct step input.]`
      );
    });
  });
});

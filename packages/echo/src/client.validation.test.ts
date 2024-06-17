import { expect, it, describe, beforeEach } from 'vitest';
import { Echo } from './client';
import { z } from 'zod';

describe('validation', () => {
  let echo: Echo;
  beforeEach(() => {
    echo = new Echo();
  });

  describe('zod', () => {
    it('should transform a zod schema to a json schema during discovery', async () => {
      echo.workflow('zod-validation', async ({ step, input, payload }) => {
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
      });

      const discoverResult = echo.discover();

      expect(discoverResult.workflows[0].steps[0].inputs.schema).to.deep.include({
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
      await echo.workflow(
        'zod-validation',
        async ({ step, input, payload }) => {
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
      );

      await expect(
        echo.executeWorkflow({
          action: 'execute',
          workflowId: 'zod-validation',
          inputs: {},
          data: {},
          stepId: 'test-email',
          state: [],
          subscriber: {},
        })
      ).resolves.to.deep.include({
        metadata: {
          error: false,
          status: 'success',
          duration: expect.any(Number),
        },
        options: undefined,
        outputs: {
          body: 'Test body',
          subject: 'Test subject',
        },
        providers: {},
      });
    });
  });
});

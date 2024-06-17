import { it, describe } from 'vitest';
import { workflow } from './workflow';

describe('workflow function', () => {
  describe('Type tests', () => {
    it('should not compile when the channel output is incorrect', async () => {
      await workflow('setup-workflow', async ({ step }) => {
        // @ts-expect-error - email subject is missing from the output
        await step.email('send-email', async () => ({
          body: 'Test Body',
        }));
      });
    });

    it('should not compile when the custom output is incorrect', async () => {
      await workflow('custom-test', async ({ step }) => {
        await step.custom(
          'custom',
          // @ts-expect-error - foo is a number
          async () => ({
            foo: 'bar',
            bar: 'baz',
          }),
          {
            outputSchema: {
              type: 'object',
              properties: {
                foo: { type: 'number' },
                bar: { type: 'string' },
              },
              required: ['foo', 'bar'],
              additionalProperties: false,
            } as const,
          }
        );
      });
    });

    it('should not compile when the custom result is compared incorrectly', async () => {
      await workflow('custom-test-something', async ({ step }) => {
        const result = await step.custom(
          'custom',
          async () => ({
            foo: 1,
            bar: 'baz',
          }),
          {
            outputSchema: {
              type: 'object',
              properties: {
                foo: { type: 'number' },
                bar: { type: 'string' },
              },
              required: ['foo', 'bar'],
              additionalProperties: false,
            } as const,
          }
        );

        // @ts-expect-error - result is a string
        result?.foo === 'custom';
      });
    });
  });
});

import { expect } from '@jest/globals';

import { Echo } from './client';

describe('Client', () => {
  let echo: Echo;

  beforeEach(() => {
    echo = new Echo();

    echo.workflow('in-app-test-something-1', async ({ step }) => {
      await step.email('send-email', async () => ({
        body: 'Test Body',
        subject: 'Subject',
      }));
    });
  });

  test('should discover 1 workflow', () => {
    const discovery = echo.discover();
    expect(discovery.workflows).toHaveLength(1);
  });

  describe('Type tests', () => {
    it('should not compile when the channel output is incorrect', async () => {
      echo.workflow('email-test', async ({ step }) => {
        // @ts-expect-error - email subject is missing from the output
        await step.email('send-email', async () => ({
          body: 'Test Body',
        }));
      });
    });

    it('should not compile when the custom output is incorrect', async () => {
      echo.workflow('custom-test', async ({ step }) => {
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
      echo.workflow('custom-test-something', async ({ step }) => {
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

  test('should discover a complex workflow with all supported step types', () => {
    echo.workflow('complex-workflow', async ({ step }) => {
      await step.email('send-email', async () => ({
        body: 'Test Body',
        subject: 'Subject',
      }));

      const inAppRes = await step.inApp('send-in-app', async () => ({
        body: 'Test Body',
        subject: 'Subject',
      }));

      await step.chat('send-chat', async () => ({
        body: 'Test Body',
      }));

      await step.push('send-push', async () => ({
        body: 'Test Body',
        subject: 'Title',
      }));

      await step.custom(
        'send-custom',
        async (input) => ({
          fooBoolean: inAppRes.read,
          fooString: input.someString,
        }),
        {
          inputSchema: {
            type: 'object',
            properties: {
              someString: { type: 'string' },
            },
            required: ['someString'],
            additionalProperties: false,
          } as const,
          outputSchema: {
            type: 'object',
            properties: {
              fooBoolean: { type: 'boolean' },
              fooString: { type: 'string' },
            },
            required: ['fooBoolean', 'fooString'],
            additionalProperties: false,
          } as const,
        }
      );

      await step.sms('send-sms', async () => ({
        body: 'Test Body',
        to: '+1234567890',
      }));

      await step.digest('digest', async () => ({
        amount: 1,
        unit: 'hours',
      }));

      await step.delay('delay', async () => ({
        amount: 1,
        unit: 'hours',
      }));
    });
  });
});

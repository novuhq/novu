import { it, describe, beforeEach, expect, vi, afterEach } from 'vitest';
import { Novu } from '@novu/api';

import { MissingSecretKeyError, WorkflowPayloadInvalidError } from './errors';
import { workflow } from './workflow';

describe('workflow function', () => {
  describe('Type tests', () => {
    it('should not compile when the channel output is incorrect', async () => {
      workflow('setup-workflow', async ({ step }) => {
        // @ts-expect-error - email subject is missing from the output
        await step.email('send-email', async () => ({
          body: 'Test Body',
        }));
      });
    });

    it('should not compile when the custom output is incorrect', async () => {
      workflow('custom-test', async ({ step }) => {
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
      workflow('custom-test-something', async ({ step }) => {
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

  describe('trigger', () => {
    beforeEach(() => {
      process.env.NOVU_SECRET_KEY = 'test';
      process.env.NOVU_BRIDGE_ORIGIN = 'https://acme.org';
    });

    afterEach(() => {
      delete process.env.NOVU_SECRET_KEY;
      delete process.env.NOVU_BRIDGE_ORIGIN;
    });

    const testPayloadSchema = {
      type: 'object',
      properties: {
        foo: { type: 'string' },
      },
      required: ['foo'],
      additionalProperties: false,
    } as const;

    it('should not compile when payload typings are incorrect', async () => {
      const testWorkflow = workflow(
        'test-workflow',
        async ({ step }) => {
          await step.custom('custom', async () => ({
            foo: 'bar',
          }));
        },
        {
          payloadSchema: testPayloadSchema,
        }
      );

      // Capture in a test function to avoid throwing execution errors
      const testFn = () =>
        testWorkflow.trigger({
          // @ts-expect-error - foo is missing from the payload
          payload: {},
          to: ['test@test.com'],
        });
    });

    it('should throw an error when the NOVU_SECRET_KEY is not set', async () => {
      const originalEnv = process.env.NOVU_SECRET_KEY;
      delete process.env.NOVU_SECRET_KEY;

      const testWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.custom('custom', async () => ({
          foo: 'bar',
        }));
      });

      await expect(
        testWorkflow.trigger({
          payload: {},
          to: ['test@test.com'],
        })
      ).rejects.toThrow(MissingSecretKeyError);

      process.env.NOVU_SECRET_KEY = originalEnv;
    });

    it('should throw an error when the incorrect payload is provided', async () => {
      const testWorkflow = workflow(
        'test-workflow',
        async ({ step }) => {
          await step.custom('custom', async () => ({
            foo: 'bar',
          }));
        },
        {
          payloadSchema: testPayloadSchema,
        }
      );

      await expect(
        testWorkflow.trigger({
          // @ts-expect-error - foo is missing from the payload
          payload: {},
          to: ['test@test.com'],
        })
      ).rejects.toThrow(WorkflowPayloadInvalidError);
    });

    it('should call Novu.trigger with bridgeUrl and name when provided with a valid payload', async () => {
      const testWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.custom('custom', async () => ({
          foo: 'bar',
        }));
      });

      const triggerMock = vi.spyOn(Novu.prototype, 'trigger').mockResolvedValue({
        transactionId: '123',
        acknowledged: true,
        status: 'processed',
      });

      const testEvent = {
        payload: {
          foo: 'bar',
        },
        to: ['test@test.com'],
      };

      await testWorkflow.trigger(testEvent);

      expect(triggerMock).toHaveBeenCalledWith({
        ...testEvent,
        bridgeUrl: `${process.env.NOVU_BRIDGE_ORIGIN}/api/novu`,
        name: 'test-workflow',
      });
    });

    it('should call Novu.events.cancel when the trigger is cancelled', async () => {
      const testWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.custom('custom', async () => ({
          foo: 'bar',
        }));
      });

      const mockCancelResult = true;
      const mockTransactionId = '123';
      vi.spyOn(Novu.prototype, 'trigger').mockResolvedValue({
        transactionId: mockTransactionId,
        acknowledged: true,
        status: 'processed',
      });
      const cancelMock = vi.spyOn(Novu.prototype.events, 'cancel').mockResolvedValue({ data: mockCancelResult });

      const triggerResult = await testWorkflow.trigger({
        payload: {
          foo: 'bar',
        },
        to: ['test@test.com'],
      });

      await triggerResult.cancel();

      expect(cancelMock).toHaveBeenCalledWith(mockTransactionId);
    });
  });
});

import { it, describe, beforeEach, expect, vi, afterEach } from 'vitest';
import { MissingSecretKeyError } from '../../errors';
import { workflow } from './workflow.resource';

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
                bar: { type: 'string', default: 'baz' },
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

    it('should compile when returning undefined for a built-in step property that has a default value', async () => {
      const delayType = undefined;
      workflow('built-in-default-test', async ({ step }) => {
        await step.delay('custom', async () => ({
          type: delayType,
          amount: 1,
          unit: 'seconds',
        }));
      });
    });

    it('should compile when returning undefined for a custom step property that has a default value', async () => {
      workflow('custom-default-test', async ({ step }) => {
        await step.custom(
          'custom',
          async () => ({
            withDefault: undefined,
            withoutDefault: 'bar',
          }),
          {
            outputSchema: {
              type: 'object',
              properties: {
                withDefault: { type: 'string', default: 'bar' },
                withoutDefault: { type: 'string' },
              },
              required: ['withoutDefault'],
              additionalProperties: false,
            } as const,
          }
        );
      });
    });
  });

  it('should include the defined preferences', async () => {
    const { definition } = workflow(
      'setup-workflow',
      async ({ step }) => {
        await step.email('send-email', async () => ({
          subject: 'Test Subject',
          body: 'Test Body',
        }));
      },
      {
        preferences: {
          channels: {
            email: { enabled: true },
          },
        },
      }
    );

    expect(definition.preferences).to.deep.equal({
      channels: {
        email: { enabled: true },
      },
    });
  });

  it('should include the defined name', async () => {
    const { definition } = workflow(
      'workflow-with-name',
      async ({ step }) => {
        await step.email('send-email', async () => ({
          subject: 'Test Subject',
          body: 'Test Body',
        }));
      },
      {
        name: 'My Workflow',
      }
    );

    expect(definition.name).to.equal('My Workflow');
  });

  it('should include the defined description', async () => {
    const { definition } = workflow(
      'workflow-with-description',
      async ({ step }) => {
        await step.email('send-email', async () => ({
          subject: 'Test Subject',
          body: 'Test Body',
        }));
      },
      {
        description: 'My Workflow Description',
      }
    );

    expect(definition.description).to.equal('My Workflow Description');
  });

  describe('trigger', () => {
    beforeEach(() => {
      process.env.NOVU_SECRET_KEY = 'test';
    });

    afterEach(() => {
      delete process.env.NOVU_SECRET_KEY;
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
          to: 'test@test.com',
        });
    });

    it('should compile when returning undefined for a payload property that has a default value', async () => {
      const testWorkflow = workflow(
        'test-workflow',
        async ({ step }) => {
          await step.custom('custom', async () => ({
            foo: 'bar',
          }));
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              withDefault: { type: 'string', default: 'bar' },
              withoutDefault: { type: 'string' },
            },
            required: ['withoutDefault'],
            additionalProperties: false,
          } as const,
        }
      );

      // Capture in a test function to avoid throwing execution errors

      const testFn = () =>
        testWorkflow.trigger({
          payload: {
            withDefault: undefined,
            withoutDefault: 'bar',
          },
          to: 'test@test.com',
        });
    });

    it('should not compile when the payload is not specified and the payloadSchema declares required properties', async () => {
      const testWorkflow = workflow(
        'test-workflow',
        async ({ step }) => {
          await step.custom('custom', async () => ({
            foo: 'bar',
          }));
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
            required: ['foo'],
            additionalProperties: false,
          } as const,
        }
      );

      // Capture in a test function to avoid throwing execution errors

      const testFn = () =>
        testWorkflow.trigger({
          // @ts-expect-error - payload is missing from the trigger
          payload: undefined,
          to: 'test@test.com',
        });
    });

    it('should compile when the payload is not specified and the payloadSchema does not declare required properties', async () => {
      const testWorkflow = workflow(
        'test-workflow',
        async ({ step }) => {
          await step.custom('custom', async () => ({
            foo: 'bar',
          }));
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
            additionalProperties: false,
          } as const,
        }
      );

      // Capture in a test function to avoid throwing execution errors

      const testFn = () =>
        testWorkflow.trigger({
          to: 'test@test.com',
        });
    });

    it('should compile when the payload is not specified and the payloadSchema is not specified', async () => {
      const testWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.custom('custom', async () => ({
          foo: 'bar',
        }));
      });

      // Capture in a test function to avoid throwing execution errors

      const testFn = () =>
        testWorkflow.trigger({
          to: 'test@test.com',
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
          to: 'test@test.com',
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
          to: 'test@test.com',
        })
      ).rejects.toThrowError(
        `Workflow with id: \`test-workflow\` has invalid \`payload\`. Please provide the correct payload`
      );
    });

    it('should make an API call without validating when the payloaSchema is not provided', async () => {
      const testWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.custom('custom', async () => ({
          foo: 'bar',
        }));
      });

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => {
          return Promise.resolve({
            transactionId: '123',
          });
        },
      });
      global.fetch = fetchMock;

      await testWorkflow.trigger({
        to: 'test@test.com',
        payload: {
          free: 'field',
        },
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching('/events/trigger'),
        expect.objectContaining({
          body: JSON.stringify({
            name: 'test-workflow',
            to: 'test@test.com',
            payload: {
              free: 'field',
            },
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
          },
          method: 'POST',
        })
      );
    });

    it('should make an API call when provided with a valid payload', async () => {
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

      const fetchMock = vi.fn().mockResolvedValueOnce({
        ok: true,
        json: () => {
          return Promise.resolve({
            transactionId: '123',
          });
        },
      });
      global.fetch = fetchMock;

      const result = await testWorkflow.trigger({
        payload: {
          foo: 'bar',
        },
        to: 'test@test.com',
      });

      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching('/events/trigger'),
        expect.objectContaining({
          body: JSON.stringify({
            name: 'test-workflow',
            to: 'test@test.com',
            payload: {
              foo: 'bar',
            },
          }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
          },
          method: 'POST',
        })
      );

      expect(result.data).toEqual({
        transactionId: '123',
      });
    });

    it('should call the correct API endpoint when the trigger is cancelled', async () => {
      const testWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.custom('custom', async () => ({
          foo: 'bar',
        }));
      });

      const mockCancelResult = true;
      const mockTransactionId = '123';
      const fetchMock = vi.fn().mockImplementation((input: string) => {
        if (input.endsWith(`/events/trigger/${mockTransactionId}`)) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockCancelResult),
          });
        } else if (input.endsWith('/events/trigger')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ transactionId: mockTransactionId }),
          });
        } else {
          throw new Error('Invalid fetch call');
        }
      });
      global.fetch = fetchMock;

      const triggerResult = await testWorkflow.trigger({
        payload: {
          foo: 'bar',
        },
        to: 'test@test.com',
      });

      const test = await triggerResult.cancel();

      expect(test).toBe(mockCancelResult);
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringMatching(`/events/trigger/${mockTransactionId}`),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            Authorization: `ApiKey ${process.env.NOVU_SECRET_KEY}`,
          },
          method: 'DELETE',
        })
      );
    });
  });
});

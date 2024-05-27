import { expect } from '@jest/globals';

import { Echo } from './client';
import { DEFAULT_NOVU_API_BASE_URL, HttpMethodEnum, NovuApiEndpointsEnum } from './constants';
import {
  ExecutionEventInputInvalidError,
  ExecutionStateCorruptError,
  StepNotFoundError,
  WorkflowNotFoundError,
} from './errors';
import { IEvent } from './types';

describe('Echo Client', () => {
  let echo: Echo;

  beforeEach(() => {
    echo = new Echo();

    echo.workflow('setup-workflow', async ({ step }) => {
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

  describe('discover method', () => {
    test('should discover setup workflow', () => {
      const discovery = echo.discover();
      expect(discovery.workflows).toHaveLength(1);
    });

    test('should discover a complex workflow with all supported step types', async () => {
      const workflowId = 'complex-workflow';

      await echo.workflow(workflowId, async ({ step }) => {
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

      const discovery = echo.discover();
      expect(discovery.workflows).toHaveLength(2);

      const workflow = discovery.workflows.find((workflowX) => workflowX.workflowId === workflowId);

      const stepEmail = workflow?.steps.find((stepX) => stepX.stepId === 'send-email');
      expect(stepEmail).toBeDefined();
      if (stepEmail === undefined) throw new Error('stepEmail is undefined');
      expect(stepEmail.type).toBe('email');
      expect(stepEmail.code).toContain(`body: 'Test Body'`);
      expect(stepEmail.code).toContain(`subject: 'Subject'`);

      const stepInApp = workflow?.steps.find((stepX) => stepX.stepId === 'send-in-app');
      expect(stepInApp).toBeDefined();
      if (stepInApp === undefined) throw new Error('stepEmail is undefined');
      expect(stepInApp.type).toBe('in_app');
      expect(stepInApp.code).toContain(`body: 'Test Body'`);
      expect(stepInApp.code).toContain(`subject: 'Subject'`);

      const stepChat = workflow?.steps.find((stepX) => stepX.stepId === 'send-chat');
      expect(stepChat).toBeDefined();
      if (stepChat === undefined) throw new Error('stepEmail is undefined');
      expect(stepChat.type).toBe('chat');
      expect(stepChat.code).toContain(`body: 'Test Body'`);

      const stepPush = workflow?.steps.find((stepX) => stepX.stepId === 'send-push');
      expect(stepPush).toBeDefined();
      if (stepPush === undefined) throw new Error('stepEmail is undefined');
      expect(stepPush.type).toBe('push');
      expect(stepPush.code).toContain(`body: 'Test Body'`);
      expect(stepPush.code).toContain(`subject: 'Title'`);

      const stepCustom = workflow?.steps.find((stepX) => stepX.stepId === 'send-custom');
      expect(stepCustom).toBeDefined();
      if (stepCustom === undefined) throw new Error('stepEmail is undefined');
      expect(stepCustom.type).toBe('custom');
      expect(stepCustom.code).toContain(`fooBoolean: inAppRes.read`);
      expect(stepCustom.code).toContain(`fooString: input.someString`);

      const stepSms = workflow?.steps.find((stepX) => stepX.stepId === 'send-sms');
      expect(stepSms).toBeDefined();
      if (stepSms === undefined) throw new Error('stepEmail is undefined');
      expect(stepSms.type).toBe('sms');
      expect(stepSms.code).toContain(`body: 'Test Body'`);
      expect(stepSms.code).toContain(`to: '+1234567890'`);

      const stepDigest = workflow?.steps.find((stepX) => stepX.stepId === 'digest');
      expect(stepDigest).toBeDefined();
      if (stepDigest === undefined) throw new Error('stepEmail is undefined');
      expect(stepDigest.type).toBe('digest');
      expect(stepDigest.code).toContain(`amount: 1`);
      expect(stepDigest.code).toContain(`unit: 'hours'`);

      const stepDelay = workflow?.steps.find((stepX) => stepX.stepId === 'delay');
      expect(stepDelay).toBeDefined();
      if (stepDelay === undefined) throw new Error('stepEmail is undefined');
      expect(stepDelay.type).toBe('delay');
      expect(stepDelay.code).toContain(`amount: 1`);
      expect(stepDelay.code).toContain(`unit: 'hours'`);
    });

    test('should discover a slack provide with blocks', async () => {
      const workflowId = 'complex-workflow';

      await echo.workflow(workflowId, async ({ step }) => {
        await step.chat(
          'send-chat',
          async () => ({
            body: 'Test Body',
          }),
          {
            providers: {
              slack: async ({ inputs }) => {
                const blocks = [
                  {
                    type: 'header' as any,
                    text: {
                      type: 'plain_text',
                      text: 'Pretty Header',
                    },
                  },
                ];

                return { blocks };
              },
            },
          }
        );
      });

      const discovery = echo.discover();
      expect(discovery.workflows).toHaveLength(2);

      const workflow = discovery.workflows.find((workflowX) => workflowX.workflowId === workflowId);

      const stepChat = workflow?.steps.find((stepX) => stepX.stepId === 'send-chat');
      expect(stepChat).toBeDefined();
      if (stepChat === undefined) throw new Error('stepEmail is undefined');
      expect(stepChat.type).toBe('chat');
      expect(stepChat.code).toContain(`body: 'Test Body'`);
      expect(stepChat.providers[0].code).toContain(`type: 'plain_text'`);
      expect(stepChat.providers[0].code).toContain(`text: 'Pretty Header'`);
    });
  });

  describe('diff method', () => {
    const globalFetchRef = global.fetch;
    const DIFF_MOCK_RESPONSE = {
      current: { workflows: { data: 'long string' }, chimeraUrl: 'url' },
      new: { workflows: { data: 'new long string' }, chimeraUrl: 'new url' },
    };

    beforeEach(() => {
      global.fetch = jest.fn(
        () =>
          Promise.resolve({
            json: () => Promise.resolve(DIFF_MOCK_RESPONSE),
          }) as any
      );
    });

    afterEach(() => {
      global.fetch = globalFetchRef;
    });

    it('should call fetch with the correct payload on diff execution', async () => {
      const echoUrl = 'https://echo.com';

      const syncRestCallSpy = jest.spyOn(global, 'fetch');
      const diffResponse = await echo.diff(echoUrl);

      expect(syncRestCallSpy).toBeCalledTimes(1);
      expect(diffResponse).toBe(DIFF_MOCK_RESPONSE);
    });
  });

  describe('sync method', () => {
    const globalFetchRef = global.fetch;
    const DIFF_MOCK_RESPONSE = {
      current: { workflows: { data: 'long string' }, chimeraUrl: 'url' },
      new: { workflows: { data: 'new long string' }, chimeraUrl: 'new url' },
    };

    beforeEach(() => {});

    afterEach(() => {
      global.fetch = globalFetchRef;
    });

    it('should call fetch with the correct payload on sync execution', async () => {
      const echoUrl = 'https://echo.com';
      const { workflows } = await echo.discover();

      const createdWorkflows = [{ name: 'workflow', description: 'description', data: {} }];

      global.fetch = jest.fn(
        () =>
          Promise.resolve({
            json: () => Promise.resolve(createdWorkflows),
          }) as any
      );

      const syncRestCallSpy = jest.spyOn(global, 'fetch');
      const syncResponse = await echo.sync(echoUrl);

      expect(syncResponse).toBe(createdWorkflows);

      expect(syncRestCallSpy).toBeCalledTimes(1);
      expect(syncRestCallSpy).toBeCalledWith(`${DEFAULT_NOVU_API_BASE_URL}${NovuApiEndpointsEnum.SYNC}?source=sdk`, {
        body: JSON.stringify({ workflows, chimeraUrl: echoUrl }),
        headers: { 'content-type': 'application/json', authorization: 'ApiKey undefined' },
        method: HttpMethodEnum.POST,
      });
    });
  });

  describe('executeWorkflow method', () => {
    beforeEach(() => {});

    it('should execute workflow successfully when action is execute and data is provided', async () => {
      await echo.workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      const event: IEvent = {
        action: 'execute',
        data: {},
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        inputs: {},
      };

      const executionResult = await echo.executeWorkflow(event);

      expect(executionResult).toBeDefined();
      expect(executionResult.outputs).toBeDefined();
      if (!executionResult.outputs) throw new Error('executionResult.outputs is undefined');

      const body = (executionResult.outputs as any).body as string;
      expect(body).toBe('Test Body');

      const subject = (executionResult.outputs as any).subject as string;
      expect(subject).toBe('Subject');

      expect(executionResult.providers).toEqual({});

      const metadata = executionResult.metadata;
      expect(metadata.status).toBe('success');
      expect(metadata.error).toBe(false);
      expect(metadata.duration).toEqual(expect.any(Number));
    });

    it('should throw error on execute action without data', async () => {
      await echo.workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      const event: IEvent = {
        action: 'execute',
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: undefined as any,
        inputs: {},
      };

      await expect(echo.executeWorkflow(event)).rejects.toThrow(ExecutionEventInputInvalidError);
    });

    it('should preview workflow successfully when action is preview', async () => {
      await echo.workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      const event: IEvent = {
        action: 'preview',
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        inputs: {},
      };

      const executionResult = await echo.executeWorkflow(event);

      expect(executionResult).toBeDefined();
      expect(executionResult.outputs).toBeDefined();
      if (!executionResult.outputs) throw new Error('executionResult.outputs is undefined');

      const body = (executionResult.outputs as any).body as string;
      expect(body).toBe('Test Body');

      const subject = (executionResult.outputs as any).subject as string;
      expect(subject).toBe('Subject');

      expect(executionResult.providers).toEqual({});

      const metadata = executionResult.metadata;
      expect(metadata.status).toBe('success');
      expect(metadata.error).toBe(false);
      expect(metadata.duration).toEqual(expect.any(Number));
    });

    it('should throw an error when workflow ID is invalid', async () => {
      // non-existing workflow ID
      const event: IEvent = {
        action: 'execute',
        workflowId: 'non-existent-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        inputs: {},
      };

      await expect(echo.executeWorkflow(event)).rejects.toThrow(WorkflowNotFoundError);

      await echo.workflow('test-workflow2', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      // no workflow ID
      const event2 = {
        action: 'execute',
        stepId: 'send-email',
        subscriber: {},
        state: [],
      } as any;
      await expect(echo.executeWorkflow(event2)).rejects.toThrow(WorkflowNotFoundError);
    });

    it('should throw and error when step ID is not found', async () => {
      await echo.workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });
      const event: IEvent = {
        action: 'execute',
        workflowId: 'test-workflow',
        stepId: 'non-existing-step',
        subscriber: {},
        state: [],
        data: {},
        inputs: {},
      };

      await expect(echo.executeWorkflow(event)).rejects.toThrow(ExecutionStateCorruptError);
    });

    it('should throw an error when action is not provided', async () => {
      await echo.workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      const event = {
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        inputs: {},
      } as any;

      await expect(echo.executeWorkflow(event)).rejects.toThrow(Error);
    });
  });

  describe('getCode method', () => {
    let getCodeEchoInstance: Echo;

    const stepExecuteFunc = async () => ({
      body: 'Test Body',
      subject: 'Subject',
    });

    const workflowExecuteFunc = async ({ step }) => {
      await step.email('send-email', stepExecuteFunc);
    };

    beforeEach(() => {
      getCodeEchoInstance = new Echo();

      getCodeEchoInstance.workflow('setup-workflow', workflowExecuteFunc);
    });

    it('should throw an error when workflow ID is not found', () => {
      expect(() => getCodeEchoInstance.getCode('non-existent-workflow')).toThrow(WorkflowNotFoundError);
    });

    it('should throw an error when step ID is provided but not found in the workflow', () => {
      getCodeEchoInstance.workflow('test-workflow', async () => {});

      expect(() => getCodeEchoInstance.getCode('test-workflow', 'non-existent-step')).toThrow(StepNotFoundError);
    });

    it('should return code for the entire workflow when only workflow ID is provided', () => {
      const codeResult = getCodeEchoInstance.getCode('setup-workflow');

      expect(codeResult.code).toEqual(workflowExecuteFunc.toString());
    });

    it('should return code for a specific step when both workflow ID and step ID are provided', async () => {
      const codeResult = getCodeEchoInstance.getCode('setup-workflow', 'send-email');

      expect(codeResult.code).toEqual(stepExecuteFunc.toString());
    });
  });
});

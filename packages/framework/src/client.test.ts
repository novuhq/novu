import { expect, it, describe, beforeEach, vi } from 'vitest';

import { Client } from './client';
import {
  ExecutionEventPayloadInvalidError,
  ExecutionStateCorruptError,
  StepNotFoundError,
  WorkflowNotFoundError,
} from './errors';
import { workflow } from './resources';
import { Event, Step } from './types';
import { FRAMEWORK_VERSION, SDK_VERSION, PostActionEnum } from './constants';

describe('Novu Client', () => {
  let client: Client;

  beforeEach(async () => {
    const newWorkflow = workflow('setup-workflow', async ({ step }) => {
      await step.email('send-email', async () => ({
        body: 'Test Body',
        subject: 'Subject',
      }));
    });

    client = new Client({ secretKey: 'some-secret-key' });
    client.addWorkflows([newWorkflow]);
  });

  describe('client constructor', () => {
    it('should set secretKey to process.env.NOVU_SECRET_KEY by default', () => {
      const originalSecretKey = process.env.NOVU_SECRET_KEY;
      const testSecretKey = 'test-env-secret-key';
      process.env = { ...process.env, NOVU_SECRET_KEY: testSecretKey };
      const newClient = new Client();
      expect(newClient.secretKey).toBe(process.env.NOVU_SECRET_KEY);
      process.env = { ...process.env, NOVU_SECRET_KEY: originalSecretKey };
    });

    it('should set secretKey to provided secretKey', () => {
      const testSecretKey = 'test-provided-secret-key';
      const newClient = new Client({ secretKey: testSecretKey });
      expect(newClient.secretKey).toBe(testSecretKey);
    });

    it('should set strictAuthentication to false when NODE_ENV is development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env = { ...process.env, NODE_ENV: 'development' };
      const newClient = new Client({ secretKey: 'some-secret-key' });
      expect(newClient.strictAuthentication).toBe(false);
      process.env = { ...process.env, NODE_ENV: originalEnv };
    });

    it('should set strictAuthentication to false when NODE_ENV is not defined', () => {
      const originalEnv = process.env.NODE_ENV;
      // @ts-expect-error - NODE_ENV should not be undefined
      process.env = { ...process.env, NODE_ENV: undefined };
      const newClient = new Client({ secretKey: 'some-secret-key' });
      expect(newClient.strictAuthentication).toBe(false);
      process.env = { ...process.env, NODE_ENV: originalEnv };
    });

    it('should set strictAuthentication to true when NODE_ENV is production', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env = { ...process.env, NODE_ENV: 'production' };
      const newClient = new Client({ secretKey: 'some-secret-key' });
      expect(newClient.strictAuthentication).toBe(true);
      process.env = { ...process.env, NODE_ENV: originalEnv };
    });

    it('should set strictAuthentication to provided strictAuthentication', () => {
      const testStrictAuthentication = false;
      const newClient = new Client({ secretKey: 'some-secret-key', strictAuthentication: testStrictAuthentication });
      expect(newClient.strictAuthentication).toBe(testStrictAuthentication);
    });

    it('should set strictAuthentication to false when NOVU_STRICT_AUTHENTICATION_ENABLED is false', () => {
      const originalEnv = process.env.NOVU_STRICT_AUTHENTICATION_ENABLED;
      process.env = { ...process.env, NOVU_STRICT_AUTHENTICATION_ENABLED: 'false' };
      const newClient = new Client({ secretKey: 'some-secret-key' });
      expect(newClient.strictAuthentication).toBe(false);
      process.env = { ...process.env, NOVU_STRICT_AUTHENTICATION_ENABLED: originalEnv };
    });

    it('should set strictAuthentication to true when NOVU_STRICT_AUTHENTICATION_ENABLED is true', () => {
      const originalEnv = process.env.NOVU_STRICT_AUTHENTICATION_ENABLED;
      process.env = { ...process.env, NOVU_STRICT_AUTHENTICATION_ENABLED: 'true' };
      const newClient = new Client({ secretKey: 'some-secret-key' });
      expect(newClient.strictAuthentication).toBe(true);
      process.env = { ...process.env, NOVU_STRICT_AUTHENTICATION_ENABLED: originalEnv };
    });
  });

  describe('discover method', () => {
    it('should discover setup workflow', () => {
      const discovery = client.discover();
      expect(discovery.workflows).toHaveLength(1);
    });

    it('should discover a complex workflow with all supported step types', async () => {
      const workflowId = 'complex-workflow';

      const newWorkflow = workflow(workflowId, async ({ step }) => {
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
          async (controls) => ({
            fooBoolean: inAppRes.read,
            fooString: controls.someString,
          }),
          {
            controlSchema: {
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

        await step.digest('regular-digest', async () => ({
          amount: 1,
          unit: 'hours',
        }));

        await step.digest('regular-look-back-digest', async () => ({
          amount: 1,
          unit: 'hours',
          lookBackWindow: {
            amount: 1,
            unit: 'hours',
          },
        }));

        await step.digest('timed-digest', async () => ({
          cron: '0 0-23/1 * * *', // EVERY_HOUR
        }));

        await step.delay('delay', async () => ({
          type: 'regular',
          amount: 1,
          unit: 'hours',
        }));
      });

      client.addWorkflows([newWorkflow]);

      // wait for discovery to finish
      await new Promise((resolve) => {
        setTimeout(resolve, 1);
      });

      const discovery = client.discover();
      expect(discovery.workflows).toHaveLength(2);

      const foundWorkflow = discovery.workflows.find((workflowX) => workflowX.workflowId === workflowId);

      const stepEmail = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'send-email');
      expect(stepEmail).toBeDefined();
      if (stepEmail === undefined) throw new Error('stepEmail is undefined');
      expect(stepEmail.type).toBe('email');
      expect(stepEmail.code).toContain(`body: "Test Body"`);
      expect(stepEmail.code).toContain(`subject: "Subject"`);

      const stepInApp = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'send-in-app');
      expect(stepInApp).toBeDefined();
      if (stepInApp === undefined) throw new Error('stepEmail is undefined');
      expect(stepInApp.type).toBe('in_app');
      expect(stepInApp.code).toContain(`body: "Test Body"`);
      expect(stepInApp.code).toContain(`subject: "Subject"`);

      const stepChat = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'send-chat');
      expect(stepChat).toBeDefined();
      if (stepChat === undefined) throw new Error('stepEmail is undefined');
      expect(stepChat.type).toBe('chat');
      expect(stepChat.code).toContain(`body: "Test Body"`);

      const stepPush = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'send-push');
      expect(stepPush).toBeDefined();
      if (stepPush === undefined) throw new Error('stepEmail is undefined');
      expect(stepPush.type).toBe('push');
      expect(stepPush.code).toContain(`body: "Test Body"`);
      expect(stepPush.code).toContain(`subject: "Title"`);

      const stepCustom = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'send-custom');
      expect(stepCustom).toBeDefined();
      if (stepCustom === undefined) throw new Error('stepEmail is undefined');
      expect(stepCustom.type).toBe('custom');
      expect(stepCustom.code).toContain(`fooBoolean: inAppRes.read`);
      expect(stepCustom.code).toContain(`fooString: controls.someString`);

      const stepSms = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'send-sms');
      expect(stepSms).toBeDefined();
      if (stepSms === undefined) throw new Error('stepEmail is undefined');
      expect(stepSms.type).toBe('sms');
      expect(stepSms.code).toContain(`body: "Test Body"`);
      expect(stepSms.code).toContain(`to: "+1234567890"`);

      const stepRegularDigest = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'regular-digest');
      expect(stepRegularDigest).toBeDefined();
      if (stepRegularDigest === undefined) throw new Error('stepEmail is undefined');
      expect(stepRegularDigest.type).toBe('digest');
      expect(stepRegularDigest.code).toContain(`amount: 1`);
      expect(stepRegularDigest.code).toContain(`unit: "hours"`);

      const stepBackoffDigest = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'regular-look-back-digest');
      expect(stepBackoffDigest).toBeDefined();
      if (stepBackoffDigest === undefined) throw new Error('stepEmail is undefined');
      expect(stepBackoffDigest.type).toBe('digest');
      expect(stepBackoffDigest.code).toContain(`amount: 1`);
      expect(stepBackoffDigest.code).toContain(`unit: "hours"`);
      expect(stepBackoffDigest.code.trim()).toContain(
        `lookBackWindow: {
            amount: 1,
            unit: "hours"
          }`.trim()
      );

      const stepTimedDigest = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'timed-digest');
      expect(stepTimedDigest).toBeDefined();
      if (stepTimedDigest === undefined) throw new Error('stepEmail is undefined');
      expect(stepTimedDigest.type).toBe('digest');
      expect(stepTimedDigest.code).toContain(`cron: "0 0-23/1 * * *"`);

      const stepDelay = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'delay');
      expect(stepDelay).toBeDefined();
      if (stepDelay === undefined) throw new Error('stepEmail is undefined');
      expect(stepDelay.type).toBe('delay');
      expect(stepDelay.code).toContain(`amount: 1`);
      expect(stepDelay.code).toContain(`unit: "hours"`);
    });

    it('should discover a slack provide with blocks', async () => {
      const workflowId = 'complex-workflow';

      const newWorkflow = workflow(workflowId, async ({ step }) => {
        await step.chat(
          'send-chat',
          async () => ({
            body: 'Test Body',
          }),
          {
            providers: {
              slack: async () => {
                return {
                  blocks: [
                    {
                      type: 'header',
                      text: {
                        type: 'plain_text',
                        text: 'Pretty Header',
                      },
                    },
                  ],
                };
              },
            },
          }
        );
      });

      client.addWorkflows([newWorkflow]);

      const discovery = client.discover();
      expect(discovery.workflows).toHaveLength(2);

      const foundWorkflow = discovery.workflows.find((workflowX) => workflowX.workflowId === workflowId);

      const stepChat = foundWorkflow?.steps.find((stepX) => stepX.stepId === 'send-chat');
      expect(stepChat).toBeDefined();
      if (stepChat === undefined) throw new Error('stepEmail is undefined');
      expect(stepChat.type).toBe('chat');
      expect(stepChat.code).toContain(`body: "Test Body"`);
      expect(stepChat.providers[0].code).toContain(`type: "plain_text"`);
      expect(stepChat.providers[0].code).toContain(`text: "Pretty Header"`);
    });
  });

  describe('previewWorkflow method', () => {
    it('should compile default control variables for preview', async () => {
      const newWorkflow = workflow(
        'test-workflow',
        async ({ step }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: `body static prefix ${controls.name}`,
                body: controls.name,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: '{{payload.name}}' },
                },
                required: [],
                additionalProperties: false,
              } as const,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      client.addWorkflows([newWorkflow]);

      const emailEvent: Event = {
        action: PostActionEnum.PREVIEW,
        data: { name: 'John' },
        payload: { name: 'John' },
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {
          lastName: "Smith's",
        },
        state: [],
        inputs: {},
        controls: {},
      };

      const emailExecutionResult = await client.executeWorkflow(emailEvent);

      expect(emailExecutionResult).toBeDefined();
      expect(emailExecutionResult.outputs).toBeDefined();
      if (!emailExecutionResult.outputs) throw new Error('executionResult.outputs is undefined');
      const { subject } = emailExecutionResult.outputs;
      expect(subject).toBe('body static prefix John');
    });

    it('should sanitize the step result of all delivery channel step types', async () => {
      const script = `<script>alert('Hello there')</script>`;

      client.addWorkflows([
        workflow('test-workflow', async ({ step }) => {
          await step.email('send-email', async () => ({
            body: `Start of body. ${script}`,
            subject: `Start of subject. ${script}`,
          }));
        }),
      ]);

      const event: Event = {
        action: PostActionEnum.PREVIEW,
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      const executionResult = await client.executeWorkflow(event);
      expect(executionResult.outputs).toBeDefined();
      expect(executionResult.outputs.body).toBe('Start of body. ');
      expect(executionResult.outputs.subject).toBe('Start of subject. ');
    });

    it('should not sanitize the step result of custom step type', async () => {
      const script = `<script>alert('Hello there')</script>`;

      client.addWorkflows([
        workflow('test-workflow', async ({ step }) => {
          await step.custom(
            'send-email',
            async () => ({
              testVal: `Start of body. ${script}`,
            }),
            {
              outputSchema: {
                type: 'object',
                properties: {
                  testVal: { type: 'string' },
                },
                required: ['testVal'],
                additionalProperties: false,
              } as const,
            }
          );
        }),
      ]);

      const event: Event = {
        action: PostActionEnum.PREVIEW,
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      const executionResult = await client.executeWorkflow(event);
      expect(executionResult.outputs).toBeDefined();
      expect(executionResult.outputs.testVal).toBe(`Start of body. ${script}`);
    });
  });

  describe('executeWorkflow method', () => {
    it('should execute workflow successfully when action is execute and payload is provided', async () => {
      const delayConfiguration = { unit: 'seconds', amount: 1 } as const;
      const emailConfiguration = {
        body: 'Test Body',
        subject: 'Subject',
      } as const;
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => emailConfiguration);
        await step.delay('delay', async () => delayConfiguration);
      });

      const emailEvent: Event = {
        action: PostActionEnum.EXECUTE,
        data: {},
        payload: {},
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        inputs: {},
        controls: {},
      };

      client.addWorkflows([newWorkflow]);

      const emailExecutionResult = await client.executeWorkflow(emailEvent);

      expect(emailExecutionResult).toBeDefined();
      expect(emailExecutionResult.outputs).toBeDefined();
      if (!emailExecutionResult.outputs) throw new Error('executionResult.outputs is undefined');
      const { body } = emailExecutionResult.outputs;
      expect(body).toBe(emailConfiguration.body);
      const { subject } = emailExecutionResult.outputs;
      expect(subject).toBe(emailConfiguration.subject);
      expect(emailExecutionResult.providers).toEqual({});
      const { metadata } = emailExecutionResult;
      expect(metadata.status).toBe('success');
      expect(metadata.error).toBe(false);
      expect(metadata.duration).toEqual(expect.any(Number));

      const delayEvent: Event = {
        action: PostActionEnum.EXECUTE,
        data: {},
        payload: {},
        workflowId: 'test-workflow',
        stepId: 'delay',
        subscriber: {},
        state: [
          {
            stepId: 'send-email',
            outputs: {},
            state: {
              status: 'completed',
              error: undefined,
            },
          },
        ],
        inputs: {},
        controls: {},
      };

      const delayExecutionResult = await client.executeWorkflow(delayEvent);

      expect(delayExecutionResult).toBeDefined();
      expect(delayExecutionResult.outputs).toBeDefined();
      if (!delayExecutionResult.outputs) throw new Error('executionResult.outputs is undefined');
      const { unit } = delayExecutionResult.outputs;
      expect(unit).toBe(delayConfiguration.unit);
      const { amount } = delayExecutionResult.outputs;
      expect(amount).toBe(delayConfiguration.amount);
      expect(delayExecutionResult.providers).toEqual({});
      const { type } = delayExecutionResult.outputs;
      expect(type).toBe('regular');
    });

    it('should compile default control variable', async () => {
      const bodyTemplate = `
{% for element in payload.elements %}
  {{ element }}
{% endfor %}`;

      const newWorkflow = workflow(
        'test-workflow',
        async ({ step }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: `body static prefix ${controls.name} ${controls.lastName} ${controls.role}`,
                body: controls.body,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: '{{payload.name}}' },
                  lastName: { type: 'string', default: '{{subscriber.lastName}}' },
                  role: { type: 'string', default: '{{payload.role}}' },
                  body: { type: 'string', default: bodyTemplate },
                },
                required: [],
                additionalProperties: false,
              } as const,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: '`default_name`' },
              role: { type: 'string' },
              elements: { type: 'array' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      client.addWorkflows([newWorkflow]);

      const emailEvent: Event = {
        action: PostActionEnum.EXECUTE,
        data: { role: 'product manager', elements: ['cat', 'dog'] },
        payload: { role: 'product manager', elements: ['cat', 'dog'] },
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {
          lastName: "Smith's",
        },
        state: [],
        inputs: {},
        controls: {},
      };

      const emailExecutionResult = await client.executeWorkflow(emailEvent);

      expect(emailExecutionResult).toBeDefined();
      expect(emailExecutionResult.outputs).toBeDefined();
      if (!emailExecutionResult.outputs) throw new Error('executionResult.outputs is undefined');
      const { subject } = emailExecutionResult.outputs;
      expect(subject).toBe("body static prefix `default_name` Smith's product manager");
      const { body } = emailExecutionResult.outputs;
      expect(body).toContain('cat');
      expect(body).toContain('dog');
    });

    // skipped until we implement support for control variables https://linear.app/novu/issue/NV-4248/support-for-controls-in-autocomplete
    it.skip('should compile control variables used in other control variables', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email(
          'send-email',
          async (controls) => ({
            body: controls.body,
            subject: controls.subject,
          }),
          {
            controlSchema: {
              type: 'object',
              properties: {
                body: { type: 'string' },
                subject: { type: 'string' },
              },
              required: ['body', 'subject'],
              additionalProperties: false,
            } as const,
          }
        );
      });

      client.addWorkflows([newWorkflow]);

      const emailEvent: Event = {
        action: PostActionEnum.EXECUTE,
        data: {},
        payload: {},
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        inputs: {},
        controls: {
          body: 'body {{controls.subject}}',
          subject: 'subject',
        },
      };

      const emailExecutionResult = await client.executeWorkflow(emailEvent);

      expect(emailExecutionResult).toBeDefined();
      expect(emailExecutionResult.outputs).toBeDefined();
      if (!emailExecutionResult.outputs) throw new Error('executionResult.outputs is undefined');
      const { subject } = emailExecutionResult.outputs;
      expect(subject).toBe('subject');
      const { body } = emailExecutionResult.outputs;
      expect(body).toBe('body subject');
    });

    // skipped until we implement support for control variables https://linear.app/novu/issue/NV-4248/support-for-controls-in-autocomplete
    it.skip('should compile control variables nested in the same control variables', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email(
          'send-email',
          async (controls) => ({
            body: controls.body,
            subject: controls.subject,
          }),
          {
            controlSchema: {
              type: 'object',
              properties: {
                body: { type: 'string' },
                subject: { type: 'string' },
              },
              required: ['body', 'subject'],
              additionalProperties: false,
            } as const,
          }
        );
      });

      client.addWorkflows([newWorkflow]);

      const emailEvent: Event = {
        action: PostActionEnum.EXECUTE,
        data: {},
        payload: {},
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        inputs: {},
        controls: {
          body: 'body',
          subject: 'subject {{controls.subject}}',
        },
      };

      const emailExecutionResult = await client.executeWorkflow(emailEvent);

      expect(emailExecutionResult).toBeDefined();
      expect(emailExecutionResult.outputs).toBeDefined();
      if (!emailExecutionResult.outputs) throw new Error('executionResult.outputs is undefined');
      const { subject } = emailExecutionResult.outputs;
      expect(subject).toBe('subject subject {{controls.subject}}');
      const { body } = emailExecutionResult.outputs;
      expect(body).toBe('body');
    });

    it('should compile default control variable with backwards compatability for payload variables', async () => {
      const bodyTemplate = `
{% for element in elements %}
  {{ element }}
{% endfor %}`;

      const newWorkflow = workflow(
        'test-workflow',
        async ({ step }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: `body static prefix ${controls.name} ${controls.lastName} ${controls.role}`,
                body: controls.body,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: '{{name}}' },
                  lastName: { type: 'string', default: '{{subscriber.lastName}}' },
                  role: { type: 'string', default: '{{role}}' },
                  body: { type: 'string', default: bodyTemplate },
                },
                required: [],
                additionalProperties: false,
              } as const,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: '`default_name`' },
              role: { type: 'string' },
              elements: { type: 'array' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      client.addWorkflows([newWorkflow]);

      const emailEvent: Event = {
        action: PostActionEnum.EXECUTE,
        data: { role: 'product manager', elements: ['cat', 'dog'] },
        payload: { role: 'product manager', elements: ['cat', 'dog'] },
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {
          lastName: "Smith's",
        },
        state: [],
        inputs: {},
        controls: {},
      };

      const emailExecutionResult = await client.executeWorkflow(emailEvent);

      expect(emailExecutionResult).toBeDefined();
      expect(emailExecutionResult.outputs).toBeDefined();
      if (!emailExecutionResult.outputs) throw new Error('executionResult.outputs is undefined');
      const { subject } = emailExecutionResult.outputs;
      expect(subject).toBe("body static prefix `default_name` Smith's product manager");
      const { body } = emailExecutionResult.outputs;
      expect(body).toContain('cat');
      expect(body).toContain('dog');
    });

    it('should throw error on execute action without payload', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        // @ts-expect-error - testing undefined data and payload
        data: undefined,
        // @ts-expect-error - testing undefined data and payload
        payload: undefined,
        inputs: {},
        controls: {},
      };

      await expect(client.executeWorkflow(event)).rejects.toThrow(ExecutionEventPayloadInvalidError);
    });

    it('should pass the step controls and outputs to the provider execution', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }), {
          controlSchema: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
            required: ['foo'],
            additionalProperties: false,
          } as const,
          providers: {
            sendgrid: async ({ controls, outputs }) => ({
              ipPoolName: `${controls.foo} ${outputs.subject}`,
              from: {
                email: 'test@example.com',
                name: 'Test',
              },
            }),
          },
        });
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {
          foo: 'foo',
        },
      };

      const executionResult = await client.executeWorkflow(event);

      expect(executionResult.providers).toEqual({
        sendgrid: {
          ipPoolName: 'foo Subject',
          from: { email: 'test@example.com', name: 'Test' },
        },
      });
    });

    it('should support a passthrough object for the provider execution', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }), {
          controlSchema: {
            type: 'object',
            properties: {
              foo: { type: 'string' },
            },
            required: ['foo'],
            additionalProperties: false,
          } as const,
          providers: {
            sendgrid: async () => ({
              _passthrough: {
                body: {
                  fooBody: 'barBody',
                },
                headers: {
                  'X-Custom-Header': 'test',
                },
                query: {
                  fooQuery: 'barQuery',
                },
              },
            }),
          },
        });
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {
          foo: 'foo',
        },
      };

      const executionResult = await client.executeWorkflow(event);

      expect(executionResult.providers).toEqual({
        sendgrid: {
          _passthrough: {
            body: {
              fooBody: 'barBody',
            },
            headers: {
              'X-Custom-Header': 'test',
            },
            query: {
              fooQuery: 'barQuery',
            },
          },
        },
      });
    });

    it('should support providers with polymorphic properties', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.chat('send-slack', async () => ({ body: 'Test Body', subject: 'Subject' }), {
          providers: {
            slack: async () => ({
              text: 'Test Body',
              blocks: [
                {
                  type: 'image',
                  image_url: 'https://example.com/image.png',
                  alt_text: 'An image',
                },
                {
                  type: 'divider',
                },
              ],
            }),
          },
        });
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'send-slack',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      const executionResult = await client.executeWorkflow(event);

      expect(executionResult.providers).toEqual({
        slack: {
          text: 'Test Body',
          blocks: [
            {
              type: 'image',
              image_url: 'https://example.com/image.png',
              alt_text: 'An image',
            },
            {
              type: 'divider',
            },
          ],
        },
      });
    });

    it('should evaluate code in the provided stepId', async () => {
      const mockFn = vi.fn();
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('active-step-id', async () => {
          mockFn();

          return { body: 'Test Body', subject: 'Subject' };
        });
        await step.email('inactive-step-id', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'active-step-id',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      await client.executeWorkflow(event);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should NOT evaluate code in steps after the provided stepId', async () => {
      const mockFn = vi.fn();
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('active-step-id', async () => ({ body: 'Test Body', subject: 'Subject' }));
        await step.email('inactive-step-id', async () => {
          mockFn();

          return { body: 'Test Body', subject: 'Subject' };
        });
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'active-step-id',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      await client.executeWorkflow(event);

      expect(mockFn).toHaveBeenCalledTimes(0);
    });

    it('should evaluate code in steps after a skipped step', async () => {
      const mockFn = vi.fn();
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('skipped-step-id', async () => ({ body: 'Test Body', subject: 'Subject' }), {
          skip: () => true,
        });
        await step.email('active-step-id', async () => {
          mockFn();

          return { body: 'Test Body', subject: 'Subject' };
        });
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'active-step-id',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      await client.executeWorkflow(event);

      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should preview with mocked payload during preview', async () => {
      const workflowMock = workflow(
        'mock-workflow',
        async ({ step, payload }) => {
          await step.email('send-email', async () => ({ body: `Test: ${payload.name}`, subject: 'Subject' }));
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          } as const,
        }
      );

      client.addWorkflows([workflowMock]);

      const event: Event = {
        action: PostActionEnum.PREVIEW,
        workflowId: 'mock-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      const executionResult = await client.executeWorkflow(event);
      expect(executionResult).toBeDefined();
      expect(executionResult.outputs).toBeDefined();

      expect(executionResult.outputs.body).toBe('Test: [placeholder]');
    });

    it('should preview workflow successfully when action is preview', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.PREVIEW,
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      const executionResult = await client.executeWorkflow(event);

      expect(executionResult).toBeDefined();
      expect(executionResult.outputs).toBeDefined();
      if (!executionResult.outputs) throw new Error('executionResult.outputs is undefined');

      const { body } = executionResult.outputs;
      expect(body).toBe('Test Body');

      const { subject } = executionResult.outputs;
      expect(subject).toBe('Subject');

      expect(executionResult.providers).toEqual({});

      const { metadata } = executionResult;
      expect(metadata.status).toBe('success');
      expect(metadata.error).toBe(false);
      expect(metadata.duration).toEqual(expect.any(Number));
    });

    it('should preview workflow successfully when action is preview and skipped', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }), {
          skip: () => true,
        });
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.PREVIEW,
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      const executionResult = await client.executeWorkflow(event);

      expect(executionResult).toBeDefined();
      expect(executionResult.outputs).toBeDefined();
      if (!executionResult.outputs) throw new Error('executionResult.outputs is undefined');

      const { body } = executionResult.outputs;
      expect(body).toBe('Test Body');

      const { subject } = executionResult.outputs;
      expect(subject).toBe('Subject');

      expect(executionResult.providers).toEqual({});

      const { metadata } = executionResult;
      expect(metadata.status).toBe('success');
      expect(metadata.error).toBe(false);
      expect(metadata.duration).toEqual(expect.any(Number));
    });

    it('should throw an error when workflow ID is invalid', async () => {
      // non-existing workflow ID
      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'non-existent-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      await expect(client.executeWorkflow(event)).rejects.toThrow(WorkflowNotFoundError);

      const newWorkflow = workflow('test-workflow2', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      client.addWorkflows([newWorkflow]);

      // @ts-expect-error - no workflow id
      const event2: Event = {
        action: PostActionEnum.EXECUTE,
        stepId: 'send-email',
        subscriber: {},
        state: [],
      };
      await expect(client.executeWorkflow(event2)).rejects.toThrow(WorkflowNotFoundError);
    });

    it('should throw and error when step ID is not found', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      client.addWorkflows([newWorkflow]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'non-existing-step',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      await expect(client.executeWorkflow(event)).rejects.toThrow(ExecutionStateCorruptError);
    });

    it('should throw an error when action is not provided', async () => {
      const newWorkflow = workflow('test-workflow', async ({ step }) => {
        await step.email('send-email', async () => ({ body: 'Test Body', subject: 'Subject' }));
      });

      client.addWorkflows([newWorkflow]);

      // @ts-expect-error - no action
      const event: Event = {
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        inputs: {},
        controls: {},
      };

      await expect(client.executeWorkflow(event)).rejects.toThrow(Error);
    });

    it('should sanitize the step result of all delivery channel step types', async () => {
      const script = `<script>alert('Hello there')</script>`;

      client.addWorkflows([
        workflow('test-workflow', async ({ step }) => {
          await step.email('send-email', async () => ({
            body: `Start of body. ${script}`,
            subject: `Start of subject. ${script}`,
          }));
        }),
      ]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      const executionResult = await client.executeWorkflow(event);
      expect(executionResult.outputs).toBeDefined();
      expect(executionResult.outputs.body).toBe('Start of body. ');
      expect(executionResult.outputs.subject).toBe('Start of subject. ');
    });

    it('should not sanitize the step result of custom step type', async () => {
      const script = `<script>alert('Hello there')</script>`;

      client.addWorkflows([
        workflow('test-workflow', async ({ step }) => {
          await step.custom(
            'send-email',
            async () => ({
              testVal: `Start of body. ${script}`,
            }),
            {
              outputSchema: {
                type: 'object',
                properties: {
                  testVal: { type: 'string' },
                },
                required: ['testVal'],
                additionalProperties: false,
              } as const,
            }
          );
        }),
      ]);

      const event: Event = {
        action: PostActionEnum.EXECUTE,
        workflowId: 'test-workflow',
        stepId: 'send-email',
        subscriber: {},
        state: [],
        data: {},
        payload: {},
        inputs: {},
        controls: {},
      };

      const executionResult = await client.executeWorkflow(event);
      expect(executionResult.outputs).toBeDefined();
      expect(executionResult.outputs.testVal).toBe(`Start of body. ${script}`);
    });
  });

  describe('getCode method', () => {
    let getCodeClientInstance: Client;

    const stepExecuteFunc = async () => ({
      body: 'Test Body',
      subject: 'Subject',
    });

    const workflowExecuteFunc = async ({ step }: { step: Step }) => {
      await step.email('send-email', stepExecuteFunc);
    };

    beforeEach(async () => {
      getCodeClientInstance = new Client({ secretKey: 'some-secret-key' });

      const newWorkflow = workflow('setup-workflow', workflowExecuteFunc);

      getCodeClientInstance.addWorkflows([newWorkflow]);
    });

    it('should throw an error when workflow ID is not found', () => {
      expect(() => getCodeClientInstance.getCode('non-existent-workflow')).toThrow(WorkflowNotFoundError);
    });

    it('should throw an error when step ID is provided but not found in the workflow', async () => {
      const newWorkflow = workflow('test-workflow', workflowExecuteFunc);

      getCodeClientInstance.addWorkflows([newWorkflow]);

      expect(() => getCodeClientInstance.getCode('test-workflow', 'non-existent-step')).toThrow(StepNotFoundError);
    });

    it('should return code for the entire workflow when only workflow ID is provided', () => {
      const codeResult = getCodeClientInstance.getCode('setup-workflow');

      expect(codeResult.code).toEqual(workflowExecuteFunc.toString());
    });

    it('should return code for a specific step when both workflow ID and step ID are provided', async () => {
      const codeResult = getCodeClientInstance.getCode('setup-workflow', 'send-email');

      expect(codeResult.code).toEqual(stepExecuteFunc.toString());
    });
  });

  describe('healthCheck method', () => {
    it('should return expected data from healthCheck method', () => {
      const toCheck = client.healthCheck();

      expect(toCheck).toEqual({
        discovered: {
          steps: 1,
          workflows: 1,
        },
        frameworkVersion: FRAMEWORK_VERSION,
        sdkVersion: SDK_VERSION,
        status: 'ok',
      });
    });
  });
});

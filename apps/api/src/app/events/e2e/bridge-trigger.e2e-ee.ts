import axios from 'axios';
import { expect } from 'chai';
import { v4 as uuidv4 } from 'uuid';

import { SubscribersService, UserSession } from '@novu/testing';
import {
  ExecutionDetailsRepository,
  JobRepository,
  MessageRepository,
  NotificationTemplateRepository,
  SubscriberEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  ExecutionDetailsStatusEnum,
  JobStatusEnum,
  MessagesStatusEnum,
  StepTypeEnum,
} from '@novu/shared';
import { workflow } from '@novu/framework';

import { EchoServer } from '../../../../e2e/echo.server';

const eventTriggerPath = '/v1/events/trigger';

type Context = { name: string; isStateful: boolean };
const contexts: Context[] = [
  { name: 'stateful', isStateful: true },
  { name: 'stateless', isStateful: false },
];

contexts.forEach((context: Context) => {
  describe('Bridge Trigger', async () => {
    let session: UserSession;
    let echoServer: EchoServer;
    const messageRepository = new MessageRepository();
    const workflowsRepository = new NotificationTemplateRepository();
    const jobRepository = new JobRepository();
    let subscriber: SubscriberEntity;
    let subscriberService: SubscribersService;
    const executionDetailsRepository = new ExecutionDetailsRepository();
    let bridge;

    beforeEach(async () => {
      echoServer = new EchoServer();
      bridge = context.isStateful ? undefined : { url: echoServer.serverPath + '/echo' };
      session = new UserSession();
      await session.initialize();
      subscriberService = new SubscribersService(session.organization._id, session.environment._id);
      subscriber = await subscriberService.createSubscriber();
    });

    afterEach(async () => {
      await echoServer.stop();
    });

    it(`should trigger the echo workflow with sync [${context.name}]`, async () => {
      const workflowId = `hello-world-${context.name + '-' + uuidv4()}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: 'This is an email subject ' + controls.name,
                body: 'Body result ' + payload.name,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                },
              } as const,
            }
          );

          await step.inApp(
            'send-in-app',
            async (controls) => {
              return {
                body: 'in-app result ' + payload.name,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                },
              } as const,
            }
          );

          await step.sms(
            'send-sms',
            async (controls) => {
              return {
                body: 'sms result ' + payload.name,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                },
              } as const,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await echoServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncEcho(session, workflowsRepository, workflowId, echoServer);

        const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
        expect(foundWorkflow).to.be.ok;

        if (!foundWorkflow) {
          throw new Error('Workflow not found');
        }
      }

      await triggerEvent(session, workflowId, subscriber, { name: 'test_name' }, bridge);
      await session.awaitRunningJobs();

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: { $in: [StepTypeEnum.EMAIL, StepTypeEnum.IN_APP, StepTypeEnum.SMS] },
      });

      expect(messages.length).to.be.eq(3);
      const emailMessage = messages.find((message) => message.channel === ChannelTypeEnum.EMAIL);
      expect(emailMessage?.subject).to.include('This is an email subject TEST');
      const inAppMessage = messages.find((message) => message.channel === ChannelTypeEnum.IN_APP);
      expect(inAppMessage?.content).to.include('in-app result test_name');
      const smsMessage = messages.find((message) => message.channel === ChannelTypeEnum.SMS);
      expect(smsMessage?.content).to.include('sms result test_name');
    });

    it(`should skip by static value [${context.name}]`, async () => {
      const workflowIdSkipByStatic = `skip-by-static-value-workflow-${context.name + '-' + uuidv4()}`;
      const newWorkflow = workflow(
        workflowIdSkipByStatic,
        async ({ step, payload }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: 'This is an email subject ' + controls.name,
                body: 'Body result ' + payload.name,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                },
              } as const,
              skip: () => true,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await echoServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await syncWorkflow(session, workflowsRepository, workflowIdSkipByStatic, echoServer);
      }

      await triggerEvent(session, workflowIdSkipByStatic, subscriber, null, bridge);
      await session.awaitRunningJobs();

      const executedMessageByStatic = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(executedMessageByStatic.length).to.be.eq(0);

      const cancelledJobByStatic = await jobRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        type: StepTypeEnum.EMAIL,
      });

      expect(cancelledJobByStatic.length).to.be.eq(1);
      expect(cancelledJobByStatic[0].status).to.be.eq(JobStatusEnum.CANCELED);
    });

    it(`should skip by variable default value [${context.name}]`, async () => {
      const workflowIdSkipByVariable = `skip-by-variable-default-value-${context.name + '-' + uuidv4()}`;
      const newWorkflow = workflow(
        workflowIdSkipByVariable,
        async ({ step, payload }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: 'This is an email subject ' + controls.name,
                body: 'Body result ' + payload.name,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'TEST' },
                  shouldSkipVar: { type: 'boolean', default: true },
                },
              } as const,
              skip: (controls) => controls.shouldSkipVar,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await echoServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await syncWorkflow(session, workflowsRepository, workflowIdSkipByVariable, echoServer);
      }

      await triggerEvent(session, workflowIdSkipByVariable, subscriber, null, bridge);
      await session.awaitRunningJobs();

      const executedMessage = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(executedMessage.length).to.be.eq(0);

      const cancelledJobByVariable = await jobRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        type: StepTypeEnum.EMAIL,
      });

      expect(cancelledJobByVariable.length).to.be.eq(1);
      expect(cancelledJobByVariable[0].status).to.be.eq(JobStatusEnum.CANCELED);
    });

    it(`should have execution detail errors for invalid trigger payload [${context.name}]`, async () => {
      const workflowId = `missing-payload-name-${context.name + '-' + uuidv4()}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.email('send-email', async () => {
            return {
              subject: 'This is an email subject',
              body: 'Body result',
            };
          });
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
            additionalProperties: false,
          } as const,
        }
      );

      await echoServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncEcho(session, workflowsRepository, workflowId, echoServer);
      }

      await triggerEvent(session, workflowId, subscriber, {}, bridge);

      await session.awaitRunningJobs(undefined);

      const messagesAfter = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(messagesAfter.length).to.be.eq(0);
      const executionDetailsRequired = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        status: ExecutionDetailsStatusEnum.WARNING,
      });

      let raw = JSON.parse(executionDetailsRequired[0]?.raw ?? '');
      let error = raw.raw.data[0].message;

      expect(error).to.include("must have required property 'name'");

      await executionDetailsRepository.delete({ _environmentId: session.environment._id });

      await triggerEvent(session, workflowId, subscriber, { name: 4 }, bridge);
      await session.awaitRunningJobs();

      const executionDetailsInvalidType = await executionDetailsRepository.find({
        _environmentId: session.environment._id,
        status: ExecutionDetailsStatusEnum.WARNING,
      });
      raw = JSON.parse(executionDetailsInvalidType[0]?.raw ?? '');
      error = raw.raw.data[0].message;

      expect(error).to.include('must be string');
    });

    it(`should use custom step [${context.name}]`, async () => {
      const workflowId = `with-custom-step-${context.name + '-' + uuidv4()}`;
      const newWorkflow = workflow(workflowId, async ({ step }) => {
        const resInApp = await step.inApp('send-in-app', async () => {
          return {
            body: `Hello There`,
          };
        });

        const resCustom = await step.custom(
          'custom',
          async () => {
            await markAllSubscriberMessagesAs(session, subscriber.subscriberId, MessagesStatusEnum.READ);

            return { readString: 'Read', unReadString: 'Unread' };
          },
          {
            outputSchema: {
              type: 'object',
              properties: {
                readString: { type: 'string' },
                unReadString: { type: 'string' },
              },
              required: [],
              additionalProperties: false,
            } as const,
          }
        );

        await step.email('send-email', async () => {
          const emailSubject = resInApp.read ? resCustom?.readString : resCustom?.unReadString;

          return {
            subject: `${emailSubject}`,
            body: 'Email Body',
          };
        });
      });

      await echoServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncEcho(session, workflowsRepository, workflowId, echoServer);
      }

      await triggerEvent(session, workflowId, subscriber, {}, bridge);

      await session.awaitRunningJobs();

      const messagesAfterInApp = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.IN_APP,
      });

      expect(messagesAfterInApp.length).to.be.eq(1);

      const messagesAfterEmail = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });
      expect(messagesAfterEmail.length).to.be.eq(1);
      expect(messagesAfterEmail[0].subject).to.include('Read');
    });

    it(`should trigger the echo workflow with digest [${context.name}]`, async () => {
      const workflowId = `digest-workflow-${context.name + '-' + uuidv4()}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          const digestResponse = await step.digest(
            'digest',
            async (controls) => {
              return {
                amount: controls.amount,
                unit: controls.unit,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number',
                    default: 2,
                  },
                  unit: {
                    type: 'string',
                    enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
                    default: 'seconds',
                  },
                },
              } as const,
            }
          );

          await step.sms('send-sms', async () => {
            const events = digestResponse.events.length;

            return {
              body: `${events} people liked your post`,
            };
          });
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await echoServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncEcho(session, workflowsRepository, workflowId, echoServer);
      }

      await triggerEvent(session, workflowId, subscriber, { name: 'John' }, bridge);
      await triggerEvent(session, workflowId, subscriber, { name: 'Bela' }, bridge);

      await session.awaitRunningJobs();

      const messages = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.SMS,
      });

      expect(messages.length).to.be.eq(1);
      expect(messages[0].content).to.include('2 people liked your post');
    });

    it(`should trigger the echo workflow with delay [${context.name}]`, async () => {
      const workflowId = `delay-workflow-${context.name + '-' + uuidv4()}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step }) => {
          const delayResponse = await step.delay(
            'delay-id',
            async (controls) => {
              return {
                type: 'regular',
                amount: controls.amount,
                unit: controls.unit,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number',
                    default: 1,
                  },
                  unit: {
                    type: 'string',
                    enum: ['seconds', 'minutes', 'hours', 'days', 'weeks', 'months'],
                    default: 'seconds',
                  },
                },
              } as const,
            }
          );

          await step.sms(
            'send-sms',
            async () => {
              const duration = delayResponse.duration;

              return {
                body: `people waited for ${duration} seconds`,
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {},
              },
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await echoServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncEcho(session, workflowsRepository, workflowId, echoServer);
      }

      await triggerEvent(session, workflowId, subscriber, null, bridge);

      await session.awaitRunningJobs();

      const messagesAfter = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.SMS,
      });

      expect(messagesAfter.length).to.be.eq(1);
      expect(messagesAfter[0].content).to.match(/people waited for \d+ seconds/);
    });

    it(`should trigger the echo workflow with control default and payload data [${context.name}]`, async () => {
      const workflowId = `default-payload-params-workflow-${context.name + '-' + uuidv4()}`;
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.email(
            'send-email',
            async (controls) => {
              return {
                subject: 'prefix ' + controls.name,
                body: 'Body result',
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'Hello {{name}}' },
                },
              } as const,
            }
          );
        },
        {
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await echoServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncEcho(session, workflowsRepository, workflowId, echoServer);
      }

      await triggerEvent(session, workflowId, subscriber, {}, bridge);
      await session.awaitRunningJobs();
      await triggerEvent(session, workflowId, subscriber, { name: 'payload_name' }, bridge);
      await session.awaitRunningJobs();

      const sentMessage = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(sentMessage.length).to.be.eq(2);
      expect(sentMessage[1].subject).to.include('prefix Hello default_name');
      expect(sentMessage[0].subject).to.include('prefix Hello payload_name');
    });

    it(`should trigger the echo workflow with control variables [${context.name}]`, async () => {
      const workflowId = `control-variables-workflow-${context.name + '-' + uuidv4()}`;
      const stepId = 'send-email';
      const newWorkflow = workflow(
        workflowId,
        async ({ step, payload }) => {
          await step.email(
            stepId,
            async (controls) => {
              return {
                subject: 'email subject ' + controls.name,
                body: 'Body result',
              };
            },
            {
              controlSchema: {
                type: 'object',
                properties: {
                  name: { type: 'string', default: 'control default' },
                },
              } as const,
            }
          );
        },
        {
          // todo delete
          payloadSchema: {
            type: 'object',
            properties: {
              name: { type: 'string', default: 'default_name' },
            },
            required: [],
            additionalProperties: false,
          } as const,
        }
      );

      await echoServer.start({ workflows: [newWorkflow] });

      if (context.isStateful) {
        await discoverAndSyncEcho(session, workflowsRepository, workflowId, echoServer);
        await saveControlVariables(session, workflowId, stepId, { variables: { name: 'stored_control_name' } });
      }

      const controls = { steps: { [stepId]: { name: 'stored_control_name' } } };
      await triggerEvent(session, workflowId, subscriber, undefined, bridge, controls);
      await session.awaitRunningJobs();

      const sentMessage = await messageRepository.find({
        _environmentId: session.environment._id,
        _subscriberId: subscriber._id,
        channel: StepTypeEnum.EMAIL,
      });

      expect(sentMessage.length).to.be.eq(1);
      expect(sentMessage[0].subject).to.equal('email subject stored_control_name');
    });
  });
});

async function syncWorkflow(
  session: UserSession,
  workflowsRepository: NotificationTemplateRepository,
  workflowIdentifier: string,
  echoServer: EchoServer
) {
  await session.testAgent.post(`/v1/bridge/sync`).send({
    bridgeUrl: echoServer.serverPath + '/echo',
  });

  const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowIdentifier);

  expect(foundWorkflow).to.be.ok;
  if (!foundWorkflow) throw new Error('Workflow not found');
}

async function triggerEvent(
  session,
  workflowId: string,
  subscriber,
  payload?: any,
  bridge?: { url: string },
  controls?: Record<string, unknown>
) {
  const defaultPayload = {
    name: 'test_name',
  };

  await axios.post(
    `${session.serverUrl}${eventTriggerPath}`,
    {
      name: workflowId,
      to: {
        subscriberId: subscriber.subscriberId,
        email: 'test@subscriber.com',
      },
      payload: payload ?? defaultPayload,
      controls: controls ?? undefined,
      bridgeUrl: bridge?.url ?? undefined,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}

async function discoverAndSyncEcho(
  session: UserSession,
  workflowsRepository?: NotificationTemplateRepository,
  workflowIdentifier?: string,
  echoServer?: EchoServer
) {
  const discoverResponse = await session.testAgent.post(`/v1/bridge/sync`).send({
    bridgeUrl: echoServer?.serverPath + '/echo',
  });

  if (!workflowsRepository || !workflowIdentifier) {
    return discoverResponse;
  }

  const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowIdentifier);
  expect(foundWorkflow).to.be.ok;

  if (!foundWorkflow) {
    throw new Error('Workflow not found');
  }

  return discoverResponse;
}

async function saveControlVariables(
  session: UserSession,
  workflowIdentifier?: string,
  stepIdentifier?: string,
  payloadBody?: any
) {
  return await session.testAgent.put(`/v1/bridge/controls/${workflowIdentifier}/${stepIdentifier}`).send(payloadBody);
}

async function markAllSubscriberMessagesAs(session: UserSession, subscriberId: string, markAs: MessagesStatusEnum) {
  const response = await axios.post(
    `${session.serverUrl}/v1/subscribers/${subscriberId}/messages/mark-all`,
    {
      markAs,
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );

  return response.data;
}

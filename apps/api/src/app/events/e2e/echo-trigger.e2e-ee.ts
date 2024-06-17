import axios from 'axios';
import { expect } from 'chai';
import { UserSession, SubscribersService } from '@novu/testing';
import {
  MessageRepository,
  SubscriberEntity,
  NotificationTemplateRepository,
  JobRepository,
  ExecutionDetailsRepository,
} from '@novu/dal';
import { ExecutionDetailsStatusEnum, JobStatusEnum, MarkMessagesAsEnum, StepTypeEnum } from '@novu/shared';
import { echoServer } from '../../../../e2e/echo.server';
import { workflow } from '@novu/framework';

const eventTriggerPath = '/v1/events/trigger';

describe('Echo Trigger ', async () => {
  let session: UserSession;
  const messageRepository = new MessageRepository();
  const workflowsRepository = new NotificationTemplateRepository();
  const jobRepository = new JobRepository();
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const executionDetailsRepository = new ExecutionDetailsRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  afterEach(async () => {
    await echoServer.stop();
  });

  it('should trigger the echo workflow', async () => {
    const workflowId = 'hello-world';
    const newWorkflow = workflow(
      workflowId,
      async ({ step, payload }) => {
        await step.email(
          'send-email',
          async (inputs) => {
            return {
              subject: 'This is an email subject ' + inputs.name,
              body: 'Body result ' + payload.name,
            };
          },
          {
            inputSchema: {
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

    await discoverAndSyncEcho(session);

    const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(foundWorkflow).to.be.ok;

    if (!foundWorkflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(session, workflowId, subscriber, { name: 'test_name' });
    await session.awaitRunningJobs(foundWorkflow._id);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.EMAIL,
    });

    expect(messagesAfter.length).to.be.eq(1);
    expect(messagesAfter[0].subject).to.include('This is an email subject TEST');
  });

  it('should skip by static value', async () => {
    const workflowIdSkipByStatic = 'skip-by-static-value-workflow';
    const newWorkflow = workflow(
      workflowIdSkipByStatic,
      async ({ step, payload }) => {
        await step.email(
          'send-email',
          async (inputs) => {
            return {
              subject: 'This is an email subject ' + inputs.name,
              body: 'Body result ' + payload.name,
            };
          },
          {
            inputSchema: {
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

    await syncWorkflow(session);

    const workflowByStatic = await workflowsRepository.findByTriggerIdentifier(
      session.environment._id,
      workflowIdSkipByStatic
    );

    expect(workflowByStatic).to.be.ok;
    if (!workflowByStatic) throw new Error('Workflow not found');

    await triggerEvent(session, workflowIdSkipByStatic, subscriber);
    await session.awaitRunningJobs(workflowByStatic._id);

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

  it('should skip by variable default value', async () => {
    const workflowIdSkipByVariable = 'skip-by-variable-default-value';
    const newWorkflow = workflow(
      workflowIdSkipByVariable,
      async ({ step, payload }) => {
        await step.email(
          'send-email',
          async (inputs) => {
            return {
              subject: 'This is an email subject ' + inputs.name,
              body: 'Body result ' + payload.name,
            };
          },
          {
            inputSchema: {
              type: 'object',
              properties: {
                name: { type: 'string', default: 'TEST' },
                shouldSkipVar: { type: 'boolean', default: true },
              },
            } as const,
            skip: (inputs) => inputs.shouldSkipVar,
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

    await syncWorkflow(session);

    const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(
      session.environment._id,
      workflowIdSkipByVariable
    );

    expect(foundWorkflow).to.be.ok;
    if (!foundWorkflow) throw new Error('Workflow not found');

    await triggerEvent(session, workflowIdSkipByVariable, subscriber);
    await session.awaitRunningJobs(foundWorkflow._id);

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

  it('should have execution detail errors for invalid trigger payload', async () => {
    const workflowId = 'missing-payload-var';
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

    await discoverAndSyncEcho(session);

    const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(foundWorkflow).to.be.ok;

    if (!foundWorkflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(session, workflowId, subscriber, {});

    await session.awaitRunningJobs(foundWorkflow._id);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.EMAIL,
    });

    expect(messagesAfter.length).to.be.eq(0);
    const executionDetailsRequired = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: foundWorkflow._id,
      status: ExecutionDetailsStatusEnum.FAILED,
    });

    let raw = JSON.parse(executionDetailsRequired[0]?.raw ?? '');
    let error = raw.raw.data[0].message;

    expect(error).to.include("must have required property 'name'");

    await executionDetailsRepository.delete({ _environmentId: session.environment._id });

    await triggerEvent(session, workflowId, subscriber, { name: 4 });
    await session.awaitRunningJobs(foundWorkflow._id);

    const executionDetailsInvalidType = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: foundWorkflow._id,
      status: ExecutionDetailsStatusEnum.FAILED,
    });
    raw = JSON.parse(executionDetailsInvalidType[0]?.raw ?? '');
    error = raw.raw.data[0].message;

    expect(error).to.include('must be string');
  });

  it('should use custom step', async () => {
    const workflowId = 'with-custom-step';
    const newWorkflow = workflow(workflowId, async ({ step }) => {
      const resInApp = await step.inApp('send-in-app', async () => {
        return {
          body: `Hello There`,
        };
      });

      const resCustom = await step.custom(
        'custom',
        async () => {
          await markAllSubscriberMessagesAs(session, subscriber.subscriberId, MarkMessagesAsEnum.READ);

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

    await discoverAndSyncEcho(session);

    const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(foundWorkflow).to.be.ok;

    if (!foundWorkflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(session, workflowId, subscriber, {});

    await session.awaitRunningJobs(foundWorkflow._id);

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

  it('should trigger the echo workflow with digest', async () => {
    const workflowId = 'digest-workflow';
    const newWorkflow = workflow(
      workflowId,
      async ({ step }) => {
        const digestResponse = await step.digest(
          'digest',
          async (inputs) => {
            return {
              amount: inputs.amount,
              unit: inputs.unit,
            };
          },
          {
            inputSchema: {
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
            },
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

    await discoverAndSyncEcho(session);

    const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(foundWorkflow).to.be.ok;

    if (!foundWorkflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(session, workflowId, subscriber, { name: 'John' });
    await triggerEvent(session, workflowId, subscriber, { name: 'Bela' });

    await session.awaitRunningJobs(foundWorkflow?._id, false, 0);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messagesAfter.length).to.be.eq(1);
    expect(messagesAfter[0].content).to.include('2 people liked your post');
  });

  it('should trigger the echo workflow with delay', async () => {
    const workflowId = 'delay-workflow';
    const newWorkflow = workflow(
      workflowId,
      async ({ step }) => {
        const delayResponse = await step.delay(
          'delay-id',
          async (inputs) => {
            return {
              type: 'regular',
              amount: inputs.amount,
              unit: inputs.unit,
            };
          },
          {
            inputSchema: {
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
            },
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
            inputSchema: {
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

    await discoverAndSyncEcho(session);

    const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(foundWorkflow).to.be.ok;

    if (!foundWorkflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(session, workflowId, subscriber);

    await session.awaitRunningJobs(foundWorkflow?._id, true, 0);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messagesAfter.length).to.be.eq(1);
    expect(messagesAfter[0].content).to.match(/people waited for \d+ seconds/);
  });

  it('should trigger the echo workflow with input variables', async () => {
    const workflowId = 'input-variables-workflow';
    const newWorkflow = workflow(
      workflowId,
      async ({ step, payload }) => {
        await step.email(
          'send-email',
          async (inputs) => {
            return {
              subject: 'prefix ' + inputs.name,
              body: 'Body result',
            };
          },
          {
            inputSchema: {
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

    await discoverAndSyncEcho(session);

    const foundWorkflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(foundWorkflow).to.be.ok;

    if (!foundWorkflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(session, workflowId, subscriber, {});
    await session.awaitRunningJobs(foundWorkflow._id);
    await triggerEvent(session, workflowId, subscriber, { name: 'payload_name' });
    await session.awaitRunningJobs(foundWorkflow._id);

    const sentMessage = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.EMAIL,
    });

    expect(sentMessage.length).to.be.eq(2);
    expect(sentMessage[1].subject).to.include('prefix Hello default_name');
    expect(sentMessage[0].subject).to.include('prefix Hello payload_name');
  });
});

async function syncWorkflow(session) {
  const resultDiscover = await axios.get(echoServer.serverPath + '/echo?action=discover');

  await session.testAgent.post(`/v1/echo/sync`).send({
    bridgeUrl: echoServer.serverPath + '/echo',
    workflows: resultDiscover.data.workflows,
  });
}

async function triggerEvent(session, workflowId: string, subscriber, payload?: any) {
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
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}

async function discoverAndSyncEcho(session: UserSession) {
  const resultDiscover = await axios.get(echoServer.serverPath + '/echo?action=discover');

  const discoverResponse = await session.testAgent.post(`/v1/echo/sync`).send({
    bridgeUrl: echoServer.serverPath + '/echo',
    workflows: resultDiscover.data.workflows,
  });

  return discoverResponse;
}

async function markAllSubscriberMessagesAs(session: UserSession, subscriberId: string, markAs: MarkMessagesAsEnum) {
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

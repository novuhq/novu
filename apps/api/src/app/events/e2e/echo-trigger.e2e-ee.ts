import axios from 'axios';
import { expect } from 'chai';
import { UserSession, SubscribersService } from '@novu/testing';
import {
  MessageRepository,
  SubscriberEntity,
  NotificationTemplateRepository,
  ExecutionDetailsRepository,
} from '@novu/dal';
import { ExecutionDetailsStatusEnum, MarkMessagesAsEnum, StepTypeEnum } from '@novu/shared';
import { echoServer } from '../../../../e2e/echo.server';

describe('Echo Trigger ', async () => {
  let session: UserSession;
  const messageRepository = new MessageRepository();
  const workflowsRepository = new NotificationTemplateRepository();
  const executionDetailsRepository = new ExecutionDetailsRepository();

  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;

  const triggerEvent = async (workflowId: string, payload): Promise<void> => {
    await axios.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: workflowId,
        to: [subscriber.subscriberId],
        payload,
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
  };

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should trigger the echo workflow', async () => {
    const workflowId = 'hello-world';
    await echoServer.echo.workflow(
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

    await discoverAndSyncEcho(session);

    const workflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(workflow).to.be.ok;

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(workflowId, { name: 'test_name' });

    await session.awaitRunningJobs(workflow._id);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.EMAIL,
    });

    expect(messagesAfter.length).to.be.eq(1);
    expect(messagesAfter[0].subject).to.include('This is an email subject TEST');
  });

  it('should have execution detail errors for invalid trigger payload', async () => {
    const workflowId = 'missing-payload-var';
    await echoServer.echo.workflow(
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

    await discoverAndSyncEcho(session);

    const workflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(workflow).to.be.ok;

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(workflowId, {});

    await session.awaitRunningJobs(workflow._id);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.EMAIL,
    });

    expect(messagesAfter.length).to.be.eq(0);
    const executionDetailsRequired = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: workflow._id,
      status: ExecutionDetailsStatusEnum.FAILED,
    });

    let raw = JSON.parse(executionDetailsRequired[0]?.raw ?? '');
    let error = raw.raw.data[0].message;

    expect(error).to.include("must have required property 'name'");

    await executionDetailsRepository.delete({ _environmentId: session.environment._id });

    await triggerEvent(workflowId, { name: 4 });
    await session.awaitRunningJobs(workflow._id);

    const executionDetailsInvalidType = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: workflow._id,
      status: ExecutionDetailsStatusEnum.FAILED,
    });
    raw = JSON.parse(executionDetailsInvalidType[0]?.raw ?? '');
    error = raw.raw.data[0].message;

    expect(error).to.include('must be string');
  });

  it('should use custom step', async () => {
    const workflowId = 'with-custom-step';
    await echoServer.echo.workflow(workflowId, async ({ step }) => {
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

    await discoverAndSyncEcho(session);

    const workflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(workflow).to.be.ok;

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(workflowId, {});

    await session.awaitRunningJobs(workflow._id);

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
    await echoServer.echo.workflow(
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

    await discoverAndSyncEcho(session);

    const workflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(workflow).to.be.ok;

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    await triggerEvent(workflowId, { name: 'John' });
    await triggerEvent(workflowId, { name: 'Bela' });

    await session.awaitRunningJobs(workflow?._id, false, 0);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messagesAfter.length).to.be.eq(1);
    expect(messagesAfter[0].content).to.include('2 people liked your post');
  });
});

async function discoverAndSyncEcho(session: UserSession) {
  const resultDiscover = await axios.get(echoServer.serverPath + '/echo?action=discover');

  await session.testAgent.post(`/v1/echo/sync`).send({
    chimeraUrl: echoServer.serverPath + '/echo',
    workflows: resultDiscover.data.workflows,
  });
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

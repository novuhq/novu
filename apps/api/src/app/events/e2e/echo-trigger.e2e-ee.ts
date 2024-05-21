import axios from 'axios';
import { expect } from 'chai';
import { UserSession, SubscribersService } from '@novu/testing';
import { MessageRepository, SubscriberEntity, NotificationTemplateRepository, JobRepository } from '@novu/dal';
import { JobStatusEnum, StepTypeEnum } from '@novu/shared';
import { echoServer } from '../../../../e2e/echo.server';

const eventTriggerPath = '/v1/events/trigger';

describe('Echo Trigger ', async () => {
  let session: UserSession;
  const messageRepository = new MessageRepository();
  const workflowsRepository = new NotificationTemplateRepository();
  const jobRepository = new JobRepository();
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;

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

    const resultDiscover = await axios.get(echoServer.serverPath + '/echo?action=discover');

    await session.testAgent.post(`/v1/echo/sync`).send({
      chimeraUrl: echoServer.serverPath + '/echo',
      workflows: resultDiscover.data.workflows,
    });

    const workflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);
    expect(workflow).to.be.ok;

    if (!workflow) {
      throw new Error('Workflow not found');
    }

    await axios.post(
      `${session.serverUrl}${eventTriggerPath}`,
      {
        name: workflowId,
        to: {
          subscriberId: subscriber.subscriberId,
          email: 'test@subscriber.com',
        },
        payload: {
          name: 'test_name',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );
    await session.awaitRunningJobs(workflow._id);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.EMAIL,
    });

    expect(messagesAfter.length).to.be.eq(1);
    expect(messagesAfter[0].subject).to.include('This is an email subject TEST');
  });

  it('should skip step', async () => {
    const workflowId = 'hello-world-2';
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

    await syncWorkflow(session);

    const workflow = await workflowsRepository.findByTriggerIdentifier(session.environment._id, workflowId);

    expect(workflow).to.be.ok;
    if (!workflow) throw new Error('Workflow not found');

    await triggerEvent(session, workflowId, subscriber);
    await session.awaitRunningJobs(workflow._id);

    const executedMessage = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.EMAIL,
    });

    expect(executedMessage.length).to.be.eq(0);

    const executedMessage2 = await jobRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      type: StepTypeEnum.EMAIL,
    });

    expect(executedMessage2.length).to.be.eq(1);
    expect(executedMessage2[0].status).to.be.eq(JobStatusEnum.CANCELED);
  });
});

async function syncWorkflow(session) {
  const resultDiscover = await axios.get(echoServer.serverPath + '/echo?action=discover');

  await session.testAgent.post(`/v1/echo/sync`).send({
    chimeraUrl: echoServer.serverPath + '/echo',
    workflows: resultDiscover.data.workflows,
  });
}

async function triggerEvent(session, workflowId: string, subscriber) {
  await axios.post(
    `${session.serverUrl}${eventTriggerPath}`,
    {
      name: workflowId,
      to: {
        subscriberId: subscriber.subscriberId,
        email: 'test@subscriber.com',
      },
      payload: {
        name: 'test_name',
      },
    },
    {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    }
  );
}

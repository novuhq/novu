import { Novu } from '@novu/api';
import { ChannelTypeEnum } from '@novu/api/models/components';
import { NotificationTemplateEntity, SubscriberEntity } from '@novu/dal';
import { CreateWorkflowDto, StepTypeEnum, WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get Message - /messages (GET) #novu-v2', () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  it('should fetch existing messages', async () => {
    const subscriber2 = await subscriberService.createSubscriber();

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: [
        { subscriberId: subscriber.subscriberId, email: 'gg@ff.com' },
        { subscriberId: subscriber2.subscriberId, email: 'john@doe.com' },
      ],
      payload: {
        email: 'new-test-email@gmail.com',
        firstName: 'Testing of User Name',
        urlVar: '/test/url/path',
      },
    });

    await session.waitForJobCompletion(template._id);

    let response = await novuClient.messages.retrieve({});
    expect(response.result.data.length).to.be.equal(4);

    response = await novuClient.messages.retrieve({ channel: ChannelTypeEnum.Email });
    expect(response.result.data.length).to.be.equal(2);

    response = await novuClient.messages.retrieve({ subscriberId: subscriber2.subscriberId });
    expect(response.result.data.length).to.be.equal(2);
  });

  it('should fetch messages using transactionId filter', async () => {
    const subscriber3 = await subscriberService.createSubscriber();

    const transactionId1 = '1566f9d0-6037-48c1-b356-42667921cadd';
    const transactionId2 = 'd2d9f9b5-4a96-403a-927f-1f8f40c6c7a9';

    await triggerEventWithTransactionId(template.triggers[0].identifier, subscriber3.subscriberId, transactionId1);
    await triggerEventWithTransactionId(template.triggers[0].identifier, subscriber3.subscriberId, transactionId2);

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();
    await session.waitForStandardQueueCompletion();
    await session.waitForJobCompletion(template._id);

    let response = await novuClient.messages.retrieve({ subscriberId: subscriber3.subscriberId });
    expect(response.result.data.length).to.be.equal(4);

    response = await novuClient.messages.retrieve({ transactionId: [transactionId1] });
    expect(response.result.data.length).to.be.equal(2);

    response = await novuClient.messages.retrieve({ transactionId: [transactionId1, transactionId2] });
    expect(response.result.data.length).to.be.equal(4);

    response = await novuClient.messages.retrieve({ transactionId: [transactionId2] });
    expect(response.result.data.length).to.be.equal(2);
  });

  it('should fetch messages using contextKeys filter', async () => {
    const subscriber4 = await subscriberService.createSubscriber();

    const workflowBody: CreateWorkflowDto = {
      name: 'Test Context Workflow',
      workflowId: 'test-context-workflow-messages',
      __source: WorkflowCreationSourceEnum.DASHBOARD,
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          name: 'Test Step',
          controlValues: {
            subject: 'Test Subject',
            body: 'Test Body',
          },
        },
      ],
    };

    const workflowResponse = await session.testAgent.post('/v2/workflows').send(workflowBody);
    expect(workflowResponse.status).to.equal(201);
    const workflow: WorkflowResponseDto = workflowResponse.body.data;

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      to: subscriber4.subscriberId,
      payload: {},
      context: { teamId: 'team-alpha' },
    });

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      to: subscriber4.subscriberId,
      payload: {},
      context: { teamId: 'team-beta' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();
    await session.waitForStandardQueueCompletion();
    await session.waitForJobCompletion(workflow._id);

    let response = await novuClient.messages.retrieve({ subscriberId: subscriber4.subscriberId });
    expect(response.result.data.length).to.be.equal(2);

    response = await novuClient.messages.retrieve({
      subscriberId: subscriber4.subscriberId,
      contextKeys: ['teamId:team-alpha'],
    });
    expect(response.result.data.length).to.be.equal(1);

    response = await novuClient.messages.retrieve({
      subscriberId: subscriber4.subscriberId,
      contextKeys: ['teamId:team-beta'],
    });
    expect(response.result.data.length).to.be.equal(1);
  });

  async function triggerEventWithTransactionId(
    templateIdentifier: string,
    subscriberId: string,
    transactionId: string
  ) {
    return await novuClient.trigger({
      workflowId: templateIdentifier,
      to: [{ subscriberId, email: 'gg@ff.com' }],
      payload: {},
      transactionId,
    });
  }
});

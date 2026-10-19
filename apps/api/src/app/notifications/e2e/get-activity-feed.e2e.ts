import { Novu } from '@novu/api';
import { ActivityNotificationResponseDto, ChannelTypeEnum } from '@novu/api/models/components';
import { NotificationTemplateEntity, NotificationTemplateRepository, SubscriberRepository } from '@novu/dal';
import { CreateWorkflowDto, StepTypeEnum, WorkflowCreationSourceEnum, WorkflowResponseDto } from '@novu/shared';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get activity feed - /notifications (GET) #novu-v2', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let smsOnlyTemplate: NotificationTemplateEntity;
  let subscriberId: string;
  let novuClient: Novu;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    smsOnlyTemplate = await session.createChannelTemplate(StepTypeEnum.SMS);
    subscriberId = SubscriberRepository.createObjectId();
    novuClient = initNovuClassSdk(session);

    await session.testAgent
      .post('/v1/widgets/session/initialize')
      .send({
        applicationIdentifier: session.environment.identifier,
        subscriberId,
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
      })
      .expect(201);
  });

  it('should get the current activity feed of user', async () => {
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: subscriberId,
      payload: { firstName: 'Test' },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: subscriberId,
      payload: { firstName: 'Test' },
    });

    await session.waitForJobCompletion(template._id);
    const body = await novuClient.notifications.list({ page: 0 });
    const activities = body.result;

    expect(activities.hasMore).to.equal(false);
    expect(activities.data.length, JSON.stringify(body.result)).to.equal(2);
    const activity = activities.data[0];
    if (!activity || !activity.template || !activity.subscriber) {
      throw new Error(`must have activity${JSON.stringify(activity)}`);
    }
    expect(activity.template.name).to.equal(template.name);
    expect(activity.template.id).to.equal(template._id);
    expect(activity.subscriber.firstName).to.equal('Test');
    expect(activity.channels).to.be.ok;
    expect(activity.channels).to.include.oneOf(Object.keys(ChannelTypeEnum).map((i) => ChannelTypeEnum[i]));
  });

  it('should filter by channel', async () => {
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: subscriberId,
      payload: { firstName: 'Test' },
    });

    await novuClient.trigger({
      workflowId: smsOnlyTemplate.triggers[0].identifier,
      to: subscriberId,
      payload: {
        firstName: 'Test',
      },
    });

    await novuClient.trigger({
      workflowId: smsOnlyTemplate.triggers[0].identifier,
      to: subscriberId,
      payload: {
        firstName: 'Test',
      },
    });

    await session.waitForJobCompletion([template._id, smsOnlyTemplate._id]);
    await novuClient.notifications.list({ page: 0, transactionId: ChannelTypeEnum.Sms });

    const body = await novuClient.notifications.list({ page: 0, channels: [ChannelTypeEnum.Sms] });
    const activities = body.result;

    expect(activities.hasMore).to.equal(false);
    expect(activities.data.length).to.equal(2);
    const activity = activities.data[0];
    if (!activity || !activity.template || !activity.subscriber) {
      throw new Error('must have activity');
    }

    expect(activity.template?.name).to.equal(smsOnlyTemplate.name);
    expect(activity.channels).to.include(ChannelTypeEnum.Sms);
  });

  it('should filter by templateId', async () => {
    await novuClient.trigger({
      workflowId: smsOnlyTemplate.triggers[0].identifier,
      to: subscriberId,
      payload: {
        firstName: 'Test',
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: subscriberId,
      payload: { firstName: 'Test' },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: subscriberId,
      payload: { firstName: 'Test' },
    });
    await session.waitForJobCompletion(template._id);
    const body = await novuClient.notifications.list({ page: 0, templates: [template._id] });
    const activities = body.result;

    expect(activities.hasMore).to.equal(false);
    expect(activities.data.length).to.equal(2);

    expect(getActivity(activities.data, 0).template?.id).to.equal(template._id);
    expect(getActivity(activities.data, 1).template?.id).to.equal(template._id);
  });
  function getActivity(
    activities: Array<ActivityNotificationResponseDto>,
    index: number
  ): ActivityNotificationResponseDto {
    const activity = activities[index];
    if (!activity || !activity.template || !activity.subscriber) {
      throw new Error('must have activity');
    }

    return activity;
  }

  it('should filter by email', async () => {
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: {
        subscriberId: SubscriberRepository.createObjectId(),
        email: 'test@email.coms',
      },
      payload: {
        firstName: 'Test',
      },
    });
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: {
        subscriberId: SubscriberRepository.createObjectId(),
      },
      payload: {
        firstName: 'Test',
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: SubscriberRepository.createObjectId(),
      payload: {
        firstName: 'Test',
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: SubscriberRepository.createObjectId(),
      payload: {
        firstName: 'Test',
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: subscriberId,
      payload: {
        firstName: 'Test',
      },
    });

    await session.waitForJobCompletion(template._id);
    const activities = (await novuClient.notifications.list({ page: 0, emails: ['test@email.coms'] })).result.data;

    expect(activities.length).to.equal(1);
    expect(getActivity(activities, 0).template?.id).to.equal(template._id);
  });

  it('should filter by subscriberId', async () => {
    const subscriberIdToCreate = `${SubscriberRepository.createObjectId()}some-test`;

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: {
        subscriberId: subscriberIdToCreate,
        email: 'test@email.coms',
      },
      payload: {
        firstName: 'Test',
      },
    });
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: SubscriberRepository.createObjectId(),
      payload: {
        firstName: 'Test',
      },
    });

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: SubscriberRepository.createObjectId(),
      payload: {
        firstName: 'Test',
      },
    });
    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: subscriberId,
      payload: {
        firstName: 'Test',
      },
    });

    await session.waitForJobCompletion(template._id);
    const { result } = await novuClient.notifications.list({ page: 0, subscriberIds: [subscriberIdToCreate] });
    const activities = result.data;

    expect(activities.length).to.equal(1);
    expect(activities[0].template?.id, JSON.stringify(template)).to.equal(template._id);
  });

  it('should return with deleted workflow and subscriber data', async () => {
    const notificationTemplateRepository = new NotificationTemplateRepository();
    const subscriberRepository = new SubscriberRepository();
    const templateToDelete = await session.createTemplate();
    const subscriberIdToDelete = `${SubscriberRepository.createObjectId()}`;

    await novuClient.trigger({
      workflowId: templateToDelete.triggers[0].identifier,
      to: subscriberIdToDelete,
      payload: { firstName: 'Test' },
    });

    await session.waitForJobCompletion(templateToDelete._id);

    await notificationTemplateRepository.delete({ _id: templateToDelete._id, _environmentId: session.environment._id });
    const subscriberToDelete = await subscriberRepository.findOne({
      subscriberId: subscriberIdToDelete,
      _environmentId: session.environment._id,
    });
    await subscriberRepository.delete({ _id: subscriberToDelete?._id, _environmentId: session.environment._id });

    const body = await novuClient.notifications.list({ page: 0 });
    const activities = body.result;

    expect(activities.hasMore).to.equal(false);
    expect(activities.data.length, JSON.stringify(body.result)).to.equal(1);
    const activity = activities.data[0];

    expect(activity.template).to.be.undefined;
    expect(activity.subscriber).to.be.undefined;
    expect(activity.channels).to.be.ok;
    expect(activity.channels).to.include.oneOf(Object.keys(ChannelTypeEnum).map((i) => ChannelTypeEnum[i]));
  });

  it('should filter by contextKeys', async () => {
    const workflowBody: CreateWorkflowDto = {
      name: 'Test Context Workflow',
      workflowId: 'test-context-workflow-notifications',
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
      to: subscriberId,
      payload: {},
      context: { projectId: 'project-alpha' },
    });

    await novuClient.trigger({
      workflowId: workflow.workflowId,
      to: subscriberId,
      payload: {},
      context: { projectId: 'project-beta' },
    });

    await session.waitForWorkflowQueueCompletion();
    await session.waitForSubscriberQueueCompletion();
    await session.waitForStandardQueueCompletion();
    await session.waitForJobCompletion(workflow._id);

    // Test 1: No contextKeys filter - should return all notifications
    let body = await novuClient.notifications.list({ page: 0 });
    expect(body.result.data.length).to.be.equal(2);

    // Test 2: Filter by specific context - should return only matching notification
    body = await novuClient.notifications.list({ page: 0, contextKeys: ['projectId:project-alpha'] });
    expect(body.result.data.length).to.be.equal(1);
    expect(body.result.data[0].template?.id).to.equal(workflow._id);
    expect(body.result.data[0].contextKeys).to.deep.equal(['projectId:project-alpha']);

    // Test 3: Filter by different context - should return only matching notification
    body = await novuClient.notifications.list({ page: 0, contextKeys: ['projectId:project-beta'] });
    expect(body.result.data.length).to.be.equal(1);
    expect(body.result.data[0].template?.id).to.equal(workflow._id);
    expect(body.result.data[0].contextKeys).to.deep.equal(['projectId:project-beta']);
  });
});

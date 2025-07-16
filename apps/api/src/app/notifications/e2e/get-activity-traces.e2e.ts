import { MessageRepository, NotificationRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { expect } from 'chai';
import { StepTypeEnum } from '@novu/shared';
import { Novu } from '@novu/api';
import { ActivityNotificationResponseDto } from '@novu/api/models/components';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

describe('Get activity with traces - /notifications/:notificationId (GET) #novu-v2', async () => {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let novuClient: Novu;
  let originalTraceReadValue: string | undefined;
  let originalTraceWriteValue: string | undefined;
  const messageRepository: MessageRepository = new MessageRepository();
  const notificationRepository: NotificationRepository = new NotificationRepository();

  const updateNotification = async ({
    id,
    status,
    body,
  }: {
    id: string;
    status: 'read' | 'unread' | 'archive' | 'unarchive' | 'snooze' | 'unsnooze';
    body?: any;
  }) => {
    return await session.testAgent
      .patch(`/v1/inbox/notifications/${id}/${status}`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send(body);
  };

  before(async () => {
    originalTraceReadValue = process.env.IS_TRACE_LOGS_READ_ENABLED;
    originalTraceWriteValue = process.env.IS_TRACE_LOGS_ENABLED;
    (process.env as any).IS_TRACE_LOGS_READ_ENABLED = 'true';
    (process.env as any).IS_TRACE_LOGS_ENABLED = 'true';
  });

  after(async () => {
    if (originalTraceReadValue === undefined) {
      delete (process.env as any).IS_TRACE_LOGS_READ_ENABLED;
    } else {
      (process.env as any).IS_TRACE_LOGS_READ_ENABLED = originalTraceReadValue;
    }
    if (originalTraceWriteValue === undefined) {
      delete (process.env as any).IS_TRACE_LOGS_ENABLED;
    } else {
      (process.env as any).IS_TRACE_LOGS_ENABLED = originalTraceWriteValue;
    }
  });

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();

    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Test notification content {{name}}',
        },
      ],
    });

    novuClient = initNovuClassSdk(session);
  });

  it('should return traces in activity feed when traces feature flag is enabled', async () => {
    // Step 1: Trigger a notification to create trace logs
    const triggerResponse = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: session.subscriberId,
      payload: { name: 'Test User' },
    });

    expect(triggerResponse.result?.acknowledged).to.equal(true);

    // Step 2: Wait for the worker to process the notification and create traces
    await session.waitForJobCompletion(template._id);
    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: session.subscriberProfile?._id,
      _templateId: template._id,
      transactionId: triggerResponse.result?.transactionId,
    });

    expect(message).to.be.ok;
    if (!message) throw new Error('Message not found');

    const { body, status } = await updateNotification({
      id: message._id,
      status: 'read',
    });
    expect(status).to.equal(200);

    const notification = await notificationRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: session.subscriberProfile?._id,
      _templateId: template._id,
      transactionId: triggerResponse.result?.transactionId,
    });
    expect(notification).to.be.ok;
    if (!notification) throw new Error('Notification not found');

    const activityResponse = await session.testAgent.get(`/v1/notifications/${notification._id}`).expect(200);
    const activity: ActivityNotificationResponseDto = activityResponse.body.data;
    expect(activity).to.be.ok;
    if (!activity.jobs) throw new Error('Jobs not found');

    expect(activity.jobs).to.be.an('array');

    const actualDetails = activity.jobs[0].executionDetails.map((detail) => detail.detail);
    const expectedExecutionDetails = [
      'Step queued',
      'Start sending message',
      'Message created',
      'Message sent',
      'Message Read',
    ];

    expect(actualDetails.length).to.be.equal(5);
    expectedExecutionDetails.forEach((expectedDetail) => {
      expect(actualDetails).to.include(expectedDetail);
    });
  });

  it('should fallback to old method when traces query fails', async () => {
    const triggerResponse = await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      to: session.subscriberId,
      payload: { name: 'Test User' },
    });

    await session.waitForJobCompletion(template._id);

    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: session.subscriberProfile?._id,
      _templateId: template._id,
      transactionId: triggerResponse.result?.transactionId,
    });

    expect(message).to.be.ok;
    if (!message) throw new Error('Message not found');

    const notification = await notificationRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: session.subscriberProfile?._id,
      _templateId: template._id,
      transactionId: triggerResponse.result?.transactionId,
    });
    expect(notification).to.be.ok;
    if (!notification) throw new Error('Notification not found');

    const activityResponse = await session.testAgent.get(`/v1/notifications/${notification._id}`).expect(200);
    const activity: ActivityNotificationResponseDto = activityResponse.body.data;
    expect(activity).to.be.ok;
    if (!activity.jobs) throw new Error('Jobs not found');

    expect(activity.jobs).to.be.an('array');

    const actualDetails = activity.jobs[0].executionDetails.map((detail) => detail.detail);
    const expectedExecutionDetails = ['Step queued', 'Start sending message', 'Message created', 'Message sent'];

    expect(actualDetails.length).to.be.equal(4);
    expectedExecutionDetails.forEach((expectedDetail) => {
      expect(actualDetails).to.include(
        expectedDetail,
        `Expected execution detail '${expectedDetail}' not found in job. Found: ${actualDetails.join(', ')}`
      );
    });
    expect(actualDetails).to.not.include('Message Read');
  });
});

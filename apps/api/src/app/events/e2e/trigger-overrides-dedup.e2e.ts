import { Novu } from '@novu/api';
import { getEffectiveJobOverrides } from '@novu/application-generic';
import {
  JobRepository,
  MessageRepository,
  NotificationEntity,
  NotificationRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
} from '@novu/dal';
import {
  ChannelTypeEnum,
  DelayTypeEnum,
  DigestUnitEnum,
  EmailBlockTypeEnum,
  StepTypeEnum,
  TriggerOverrides,
} from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { expect } from 'chai';
import { v4 as uuid } from 'uuid';
import { initNovuClassSdk } from '../../shared/helpers/e2e/sdk/e2e-sdk.helper';

/*
 * Runs against a worker started with IS_OVERRIDES_DEDUP_ENABLED=true (see
 * apps/worker/src/.env.test): trigger overrides are stored once on the
 * notification and every reader resolves them from there.
 */
describe('Trigger overrides dedup #novu-v2', () => {
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let novuClient: Novu;
  const jobRepository = new JobRepository();
  const messageRepository = new MessageRepository();
  const notificationRepository = new NotificationRepository();

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    const subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    novuClient = initNovuClassSdk(session);
  });

  async function createEmailWorkflow(): Promise<NotificationTemplateEntity> {
    return session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.EMAIL,
          subject: 'Overrides dedup subject',
          content: [{ type: EmailBlockTypeEnum.TEXT, content: 'Overrides dedup content' }],
        },
      ],
    });
  }

  async function findNotification(transactionId: string): Promise<NotificationEntity> {
    const notification = await notificationRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      transactionId,
    });

    if (!notification) {
      throw new Error(`Notification for transaction ${transactionId} not found`);
    }

    return notification;
  }

  async function expectJobsWithoutOverrides(transactionId: string): Promise<void> {
    const jobs = await jobRepository.find(
      { _environmentId: session.environment._id, transactionId },
      '_id type overrides'
    );

    expect(jobs.length, 'jobs created for the run').to.be.greaterThan(0);
    for (const job of jobs) {
      expect(job.overrides, `job ${job._id} (${job.type}) overrides`).to.equal(undefined);
    }
  }

  it('should deliver the email to the override recipient while storing overrides only on the notification', async () => {
    const template = await createEmailWorkflow();
    const transactionId = uuid();
    const overrides = { email: { toRecipient: 'overrides-dedup@example.com' } };

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      transactionId,
      to: [{ subscriberId: subscriber.subscriberId, email: 'subscriber@example.com' }],
      overrides,
    });

    await session.waitForJobCompletion(template._id);

    const notification = await findNotification(transactionId);
    expect(notification.overrides).to.deep.equal(overrides);
    await expectJobsWithoutOverrides(transactionId);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriber._id,
      ChannelTypeEnum.EMAIL
    );
    expect(messages.length).to.equal(1);
    expect(messages[0].email).to.equal('overrides-dedup@example.com');
  });

  it('should respect the delay override resolved from the notification', async () => {
    const template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.HOURS,
            amount: 1,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.EMAIL,
          subject: 'Delayed subject',
          content: [{ type: EmailBlockTypeEnum.TEXT, content: 'Delayed content' }],
        },
      ],
    });
    const transactionId = uuid();
    const overrides = { delay: { amount: 1, unit: DigestUnitEnum.SECONDS } };

    // `delay` is not part of the typed SDK overrides, so trigger through the raw endpoint.
    await session.testAgent
      .post('/v1/events/trigger')
      .send({
        name: template.triggers[0].identifier,
        transactionId,
        to: [subscriber.subscriberId],
        overrides,
      })
      .expect(201);

    // Without the override the email step would stay pending for an hour and this would time out.
    await session.waitForJobCompletion(template._id, undefined, 20000);

    const notification = await findNotification(transactionId);
    expect(notification.overrides).to.deep.equal(overrides);
    await expectJobsWithoutOverrides(transactionId);

    const messages = await messageRepository.findBySubscriberChannel(
      session.environment._id,
      subscriber._id,
      ChannelTypeEnum.EMAIL
    );
    expect(messages.length).to.equal(1);
  });

  it('should return the overrides in the workflow run detail', async () => {
    const template = await createEmailWorkflow();
    const transactionId = uuid();
    const overrides = { email: { toRecipient: 'workflow-run-detail@example.com' } };

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      transactionId,
      to: [subscriber.subscriberId],
      overrides,
    });

    await session.waitForJobCompletion(template._id);

    const notification = await findNotification(transactionId);
    await expectJobsWithoutOverrides(transactionId);

    const { body } = await session.testAgent.get(`/v1/activity/workflow-runs/${notification._id}`).expect(200);

    expect(body.data.overrides).to.deep.equal(overrides);
  });

  it('should return the overrides on every job of the legacy notification detail', async () => {
    const template = await createEmailWorkflow();
    const transactionId = uuid();
    const overrides = { email: { toRecipient: 'legacy-detail@example.com' } };

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      transactionId,
      to: [subscriber.subscriberId],
      overrides,
    });

    await session.waitForJobCompletion(template._id);

    const notification = await findNotification(transactionId);
    await expectJobsWithoutOverrides(transactionId);

    const { body } = await session.testAgent.get(`/v1/notifications/${notification._id}`).expect(200);
    const jobs: { overrides?: Record<string, unknown> }[] = body.data.jobs;

    expect(jobs.length).to.be.greaterThan(0);
    for (const job of jobs) {
      expect(job.overrides).to.deep.equal(overrides);
    }
  });

  it('should let the scheduled unsnooze job resolve overrides from its notification', async () => {
    const template = await session.createTemplate({
      steps: [{ type: StepTypeEnum.IN_APP, content: 'Snoozable content' }],
    });
    const transactionId = uuid();
    const overrides: TriggerOverrides = { email: { toRecipient: 'unsnooze@example.com' } };

    await novuClient.trigger({
      workflowId: template.triggers[0].identifier,
      transactionId,
      to: { subscriberId: session.subscriberId },
      overrides,
    });

    await session.waitForJobCompletion(template._id);

    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      transactionId,
      channel: ChannelTypeEnum.IN_APP,
    });
    if (!message) {
      throw new Error('In-app message not found');
    }

    const snoozeUntil = new Date();
    snoozeUntil.setHours(snoozeUntil.getHours() + 1);
    await session.testAgent
      .patch(`/v1/inbox/notifications/${message._id}/snooze`)
      .set('Authorization', `Bearer ${session.subscriberToken}`)
      .send({ snoozeUntil })
      .expect(200);

    const unsnoozeJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _notificationId: message._notificationId,
      'payload.unsnooze': true,
    });
    if (!unsnoozeJob) {
      throw new Error('Scheduled unsnooze job not found');
    }

    const notification = await notificationRepository.findOne(
      { _id: unsnoozeJob._notificationId, _environmentId: session.environment._id },
      'overrides'
    );

    expect(unsnoozeJob.overrides).to.equal(undefined);
    expect(getEffectiveJobOverrides(unsnoozeJob, notification)).to.deep.equal(overrides);
  });
});

import { expect } from 'chai';
import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberRepository,
  ExecutionDetailsRepository,
  JobRepository,
  NotificationRepository,
} from '@novu/dal';
import { UserSession } from '@novu/testing';
import { sendTrigger } from '../../src/app/events/e2e/trigger-event.e2e';
import { DelayTypeEnum, DigestUnitEnum, StepTypeEnum } from '@novu/shared';
import { notificationExpireAt } from './expire-at.migration';

describe('Create expireAt - TTL support - with pending jobs', function () {
  const messageRepository = new MessageRepository();
  const notificationRepository = new NotificationRepository();
  const jobRepository = new JobRepository();
  const executionDetailsRepository = new ExecutionDetailsRepository();

  let session: UserSession;
  let digestTemplate: NotificationTemplateEntity;
  let delayTemplate: NotificationTemplateEntity;
  let query;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    digestTemplate = await createDigestTemplate(session);
    delayTemplate = await createDelayTemplate(session);
    query = {
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      expireAt: { $exists: false },
    };

    for (let i = 0; i < 5; i++) {
      const newSubscriberIdInAppNotification = SubscriberRepository.createObjectId();
      await sendTrigger(session, digestTemplate, newSubscriberIdInAppNotification);
      await sendTrigger(session, delayTemplate, newSubscriberIdInAppNotification);
      await new Promise((r) => setTimeout(r, 1000));
      await sendTrigger(session, digestTemplate, newSubscriberIdInAppNotification);
    }
    await new Promise((r) => setTimeout(r, 1000));

    await messageRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });
    await notificationRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });
    await jobRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });
    await executionDetailsRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });
  });

  it('should not add expireAt for a pending execution', async function () {
    await notificationExpireAt(query);

    const notifications = await notificationRepository.find({
      _environmentId: session.environment._id,
      _templateId: delayTemplate?._id,
    });
    const jobs = await jobRepository.find({ _environmentId: session.environment._id, _templateId: delayTemplate?._id });
    const executionDetails = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: delayTemplate?._id,
    });

    notifications.forEach((msg) => {
      expect(msg.expireAt).to.not.exist;
    });
    jobs.forEach((msg) => {
      expect(msg.expireAt).to.not.exist;
    });
    executionDetails.forEach((msg) => {
      expect(msg.expireAt).to.not.exist;
    });
  });

  it('should add expireAt to pending events that were digested', async function () {
    await session.awaitRunningJobs(digestTemplate?._id, false, 5);

    await notificationExpireAt(query);

    const notifications = await notificationRepository.find({
      _environmentId: session.environment._id,
      _templateId: digestTemplate?._id,
    });
    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: digestTemplate?._id,
    });
    const executionDetails = await executionDetailsRepository.find({
      _environmentId: session.environment._id,
      _notificationTemplateId: digestTemplate?._id,
    });

    notifications.forEach((msg) => {
      expect(msg.expireAt).to.exist;
    });
    jobs.forEach((msg) => {
      expect(msg.expireAt).to.exist;
    });
    executionDetails.forEach((msg) => {
      expect(msg.expireAt).to.exist;
    });
  });
});

async function createDelayTemplate(session) {
  return await session.createTemplate({
    steps: [
      {
        type: StepTypeEnum.IN_APP,
        content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
      },
      {
        type: StepTypeEnum.DELAY,
        content: '',
        metadata: {
          unit: DigestUnitEnum.MINUTES,
          amount: 2,
          type: DelayTypeEnum.REGULAR,
        },
      },
      {
        type: StepTypeEnum.IN_APP,
        content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
      },
    ],
  });
}
async function createDigestTemplate(session) {
  return await session.createTemplate({
    steps: [
      {
        type: StepTypeEnum.DIGEST,
        content: '',
        metadata: {
          unit: DigestUnitEnum.SECONDS,
          amount: 2,
          type: DelayTypeEnum.REGULAR,
        },
      },
      {
        type: StepTypeEnum.IN_APP,
        content: 'Hello {{step.events.length}}, Welcome to {{organizationName}}' as string,
      },
    ],
  });
}

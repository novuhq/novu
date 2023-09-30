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
import { StepTypeEnum } from '@novu/shared';
import { createExpireAt, messagesSetExpireAt } from './expire-at.migration';

describe('Create expireAt - TTL support', function () {
  const messageRepository = new MessageRepository();
  const notificationRepository = new NotificationRepository();
  const jobRepository = new JobRepository();
  const executionDetailsRepository = new ExecutionDetailsRepository();

  let session: UserSession;
  let template: NotificationTemplateEntity;
  let query;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await createTemplate(session);
    query = {
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
      expireAt: { $exists: false },
    };

    for (let i = 0; i < 5; i++) {
      const newSubscriberIdInAppNotification = SubscriberRepository.createObjectId();
      await sendTrigger(session, template, newSubscriberIdInAppNotification);
    }
    await new Promise((r) => setTimeout(r, 1000));

    await messageRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });
    await notificationRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });
    await jobRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });
    await executionDetailsRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });

    for (let i = 0; i < 5; i++) {
      const newSubscriberIdInAppNotification = SubscriberRepository.createObjectId();
      await sendTrigger(session, template, newSubscriberIdInAppNotification);
    }
    await new Promise((r) => setTimeout(r, 1000));
  });

  it('should set expireAt for messages', async function () {
    await messagesSetExpireAt(query);

    const messages = await messageRepository.find({ _environmentId: session.environment._id });

    messages.forEach((msg) => {
      expect(msg.expireAt).to.exist;
    });
  });

  it('should set expireAt for notification and its jobs and execution details', async function () {
    await createExpireAt();
    const notifications = await notificationRepository.find({ _environmentId: session.environment._id });
    const jobs = await jobRepository.find({ _environmentId: session.environment._id });
    const executionDetails = await executionDetailsRepository.find({ _environmentId: session.environment._id });

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

async function createTemplate(session) {
  return await session.createTemplate({
    steps: [
      {
        type: StepTypeEnum.SMS,
        content: 'Welcome to {{organizationName}}' as string,
      },
      {
        type: StepTypeEnum.IN_APP,
        content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
      },
      {
        type: StepTypeEnum.EMAIL,
        content: [
          {
            type: 'text',
            content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
          },
        ],
      },
    ],
  });
}

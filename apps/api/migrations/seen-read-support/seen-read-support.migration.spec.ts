import { expect } from 'chai';
import { MessageRepository, NotificationTemplateEntity, SubscriberRepository } from '@novu/dal';
import { UserSession } from '@novu/testing';
import { sendTrigger } from '../../src/app/events/e2e/trigger-event.e2e';
import { StepTypeEnum } from '@novu/shared';
import { inAppAsSeen, notInAppAsUnseen, seenToRead } from './seen-read-support.migration';

describe('Update seen/read', function () {
  const messageRepository = new MessageRepository();
  let session: UserSession;
  let template: NotificationTemplateEntity;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();

    // template = await createTemplate(session);

    for (let i = 0; i < 10; i++) {
      const newSubscriberIdInAppNotification = SubscriberRepository.createObjectId();
      await sendTrigger(session, template, newSubscriberIdInAppNotification);

      template = await session.createTemplate({
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
    await new Promise((r) => setTimeout(r, 2000));

    await messageRepository.update({}, { $unset: { read: 1 } });
  });

  it('should update all seen to read', async function () {
    await seenToRead();

    const messages = await messageRepository.find({});

    messages.forEach((msg) => {
      expect(msg.seen).to.not.exist;
      expect(msg.read).to.exist;
    });
  });

  it('should add in app seen as true', async function () {
    await seenToRead();

    await inAppAsSeen();

    const messages = await messageRepository.find({ channel: StepTypeEnum.IN_APP });

    messages.forEach((msg) => {
      expect(msg.seen).to.equal(true);
    });
  });

  it('should add not in app seen as false', async function () {
    await seenToRead();

    await inAppAsSeen();

    await notInAppAsUnseen();

    const messages = await messageRepository.find({ channel: { $ne: 'in_app' } });

    messages.forEach((msg) => {
      expect(msg.seen).to.equal(false);
    });
  });
});

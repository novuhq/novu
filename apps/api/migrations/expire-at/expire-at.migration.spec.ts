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
import { DelayTypeEnum, DigestUnitEnum, JobStatusEnum, StepTypeEnum } from '@novu/shared';
// import { inAppAsSeen, notInAppAsUnseen, seenToRead } from './seen-read-support.migration';
import { createExpireAt, messagesExpireAt } from './expire-at.migration';

describe('Create expireAt - TTL support', function () {
  const messageRepository = new MessageRepository();
  const notificationRepository = new NotificationRepository();
  const jobRepository = new JobRepository();
  const executionDetailsRepository = new ExecutionDetailsRepository();

  let session: UserSession;
  let template: NotificationTemplateEntity;
  let template2: NotificationTemplateEntity;

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    template = await createTemplate(session);
    template2 = await createTemplate2(session);

    for (let i = 0; i < 2; i++) {
      const newSubscriberIdInAppNotification = SubscriberRepository.createObjectId();
      await sendTrigger(session, template, newSubscriberIdInAppNotification, { custVar: '1' });
      await sendTrigger(session, template2, newSubscriberIdInAppNotification, { custVar: '1' });
      // await new Promise((r) => setTimeout(r, 1000));
      // await sendTrigger(session, template, newSubscriberIdInAppNotification, { custVar: '2' });
    }
    await new Promise((r) => setTimeout(r, 1000));
    console.log(session.environment.name);
    await messageRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });
    await notificationRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });
    await jobRepository.update({ _environmentId: session.environment._id }, { $unset: { expireAt: 1 } });

    // for (let i = 0; i < 1; i++) {
    //   const newSubscriberIdInAppNotification = SubscriberRepository.createObjectId();
    //   await sendTrigger(session, template, newSubscriberIdInAppNotification);
    //   await sendTrigger(session, template, newSubscriberIdInAppNotification);
    // }
    await new Promise((r) => setTimeout(r, 1000));
  });

  it('should update all seen to read', async function () {
    // console.log(session.environment._id);
    const messagesBefore = await messageRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    console.log('bef len', messagesBefore.length);
    // console.log('bef', messagesBefore);

    // await session.awaitRunningJobs(template?._id, false, 0);

    await createExpireAt();
    console.log('---------------------------------------------');
    const messages = await messageRepository.find({ _environmentId: session.environment._id });
    console.log('aft len', messages.length);
    // console.log('aft', messages);
    messages.forEach((msg) => {
      expect(msg.expireAt).to.exist;
    });
  });
  it('should notifications all seen to read', async function () {
    // console.log(session.environment._id);
    const messagesBefore = await notificationRepository.find({
      _environmentId: session.environment._id,
      _organizationId: session.organization._id,
    });
    console.log('bef len', messagesBefore.length);
    // console.log('bef', messagesBefore);

    // await session.awaitRunningJobs(template?._id, false, 0);

    await createExpireAt();
    console.log('---------------------------------------------');
    const messages = await notificationRepository.find({ _environmentId: session.environment._id });
    console.log('aft len', messages.length);
    // console.log('aft', messages);
    messages.forEach((msg) => {
      expect(msg.expireAt).to.exist;
    });
  });

  it('should digest', async function () {
    await session.awaitRunningJobs(template?._id, false, 1);

    await createExpireAt();
    console.log('---------------------------------------------');
    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      // status: { $ne: JobStatusEnum.COMPLETED },
    });
    console.log('aft len', jobs.length);
    console.log('aft', jobs);
    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      // status: { $ne: JobStatusEnum.COMPLETED },
    });
    console.log('aft len', messages.length);
    console.log('aft', messages);
    messages.forEach((msg) => {
      expect(msg.expireAt).to.exist;
    });
  });

  // it('should add not in app seen as false', async function () {
  //   // await seenToRead();
  //
  //   // await inAppAsSeen();
  //
  //   // await notInAppAsUnseen();
  //
  //   const messages = await messageRepository.find({ channel: { $ne: 'in_app' } });
  //
  //   messages.forEach((msg) => {
  //     expect(msg.seen).to.equal(false);
  //   });
  // });
});

async function createTemplate(session) {
  return await session.createTemplate({
    steps: [
      // {
      //   type: StepTypeEnum.SMS,
      //   content: 'Welcome to {{organizationName}}' as string,
      // },
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
        type: StepTypeEnum.DIGEST,
        content: '',
        metadata: {
          unit: DigestUnitEnum.SECONDS,
          amount: 5,
          type: DelayTypeEnum.REGULAR,
        },
      },
      {
        type: StepTypeEnum.IN_APP,
        content: 'Hello {{step.events.length}}, Welcome to {{organizationName}}' as string,
      },
      // {
      //   type: StepTypeEnum.EMAIL,
      //   content: [
      //     {
      //       type: 'text',
      //       content: 'Hello {{subscriber.lastName}}, Welcome to {{organizationName}}' as string,
      //     },
      //   ],
      // },
    ],
  });
}
async function createTemplate2(session) {
  return await session.createTemplate({
    steps: [
      // {
      //   type: StepTypeEnum.SMS,
      //   content: 'Welcome to {{organizationName}}' as string,
      // },
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

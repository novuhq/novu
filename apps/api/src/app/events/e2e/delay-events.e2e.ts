/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { expect } from 'chai';
import axios from 'axios';
import { addSeconds, differenceInMilliseconds, subDays } from 'date-fns';
import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import { StepTypeEnum, DelayTypeEnum, DigestUnitEnum, DigestTypeEnum, JobTopicNameEnum } from '@novu/shared';

const axiosInstance = axios.create();

describe('Trigger event - Delay triggered events - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  const messageRepository = new MessageRepository();

  const triggerEvent = async (payload, transactionId?: string, overrides = {}, to = [subscriber.subscriberId]) => {
    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        transactionId,
        name: template.triggers[0].identifier,
        to,
        payload,
        overrides,
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
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  it('should delay event for time interval', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Not Delayed {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await session.awaitRunningJobs(template?._id, true, 1);

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
    });

    expect(delayedJob!.status).to.equal(JobStatusEnum.DELAYED);

    const expireAt = new Date(delayedJob?.expireAt as string);
    const createdAt = new Date(delayedJob?.createdAt as string);

    const subExpire30Days = subDays(expireAt, 30);
    const diff = differenceInMilliseconds(subExpire30Days, createdAt);

    expect(diff).to.approximately(200, 2000);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.include('Not Delayed');

    await session.awaitRunningJobs(template?._id, true, 0);

    const messagesAfter = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
    });

    expect(messagesAfter.length).to.equal(2);
  });

  it('should override delay parameters', async function () {
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 0.1,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent(
      {
        customVar: 'Testing of User Name',
      },
      id,
      { delay: { amount: 2, unit: DigestUnitEnum.SECONDS } }
    );
    await session.awaitRunningJobs(template?._id, true, 0);
    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messages.length).to.equal(1);
  });

  it('should delay for scheduled delay', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            type: DelayTypeEnum.SCHEDULED,
            delayPath: 'sendAt',
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
      sendAt: addSeconds(new Date(), 30),
    });
    await session.awaitRunningJobs(template?._id, true, 1);

    const delayedJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DELAY,
    });

    expect(delayedJobs.length).to.eql(1);

    const delayedJob = delayedJobs[0];

    const updatedAt = delayedJob?.updatedAt as string;
    const diff = differenceInMilliseconds(new Date(delayedJob.payload.sendAt), new Date(updatedAt));

    const delay = await session.queueGet(JobTopicNameEnum.STANDARD, 'getDelayed');

    expect(delay[0].opts.delay).to.approximately(diff, 1000);
  });

  it('should not include delayed event in digested sent message', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 0.1,
            type: DelayTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Event {{eventNumber}}. Digested Events {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      eventNumber: '1',
    });

    await triggerEvent({
      eventNumber: '2',
    });

    await session.awaitRunningJobs(template?._id, true, 0);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messages[0].content).to.include('Event ');
    expect(messages[0].content).to.include('Digested Events 2');
  });

  it('should send a single message for same exact scheduled delay', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            type: DelayTypeEnum.SCHEDULED,
            delayPath: 'sendAt',
          },
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Digested Events {{step.events.length}}' as string,
        },
      ],
    });

    const dateValue = addSeconds(new Date(), 1);

    await triggerEvent({
      eventNumber: '1',
      sendAt: dateValue,
    });
    await triggerEvent({
      eventNumber: '2',
      sendAt: dateValue,
    });
    await session.awaitRunningJobs(template?._id, true, 0);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.include('Digested Events 2');
  });

  it('should fail for missing or invalid path for scheduled delay', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DELAY,
          content: '',
          metadata: {
            type: DelayTypeEnum.SCHEDULED,
            delayPath: 'sendAt',
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    try {
      await triggerEvent({
        customVar: 'Testing of User Name',
      });
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.response.data.message).to.equal('payload is missing required key(s) and type(s): sendAt (ISO Date)');
    }

    try {
      await triggerEvent({
        customVar: 'Testing of User Name',
        sendAt: '20-09-2025',
      });
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.response.data.message).to.equal('payload is missing required key(s) and type(s): sendAt (ISO Date)');
    }
  });
});

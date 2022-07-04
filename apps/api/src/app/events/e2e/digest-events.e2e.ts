import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import * as sinon from 'sinon';

import { expect } from 'chai';
import { ChannelTypeEnum, DigestUnit } from '@novu/shared';
import axios from 'axios';

const axiosInstance = axios.create();

describe('Trigger event - Digest triggered events - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let clock: sinon.SinonFakeTimers;

  const awaitRunningJobs = async (unfinishedjobs = 0) => {
    let runningJobs = 0;
    do {
      runningJobs = await jobRepository.count({
        type: {
          $nin: [ChannelTypeEnum.DIGEST],
        },
        _templateId: template._id,
        status: {
          $in: [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING],
        },
      });
    } while (runningJobs > unfinishedjobs);
  };

  beforeEach(async () => {
    clock = sinon.useFakeTimers();
    session = new UserSession();
    await session.initialize();
    template = await session.createTemplate();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
  });

  afterEach(async () => {
    sinon.restore();
  });

  it('should digest events within time interval', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: ChannelTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnit.MINUTES,
            amount: 5,
          },
        },
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload: {
          customVar: 'Testing of User Name',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload: {
          customVar: 'digest',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await awaitRunningJobs();
    clock.tick(1000 * 60 * 6);

    const jobs = await jobRepository.find({
      _templateId: template._id,
    });
    const digestJob = jobs.find((job) => job.step.template.type === ChannelTypeEnum.DIGEST);
    expect(digestJob.digest.amount).to.equal(5);
    expect(digestJob.digest.unit).to.equal(DigestUnit.MINUTES);
    const job = jobs.find((item) => item.digest.events.length > 0);
    expect(job.digest?.events?.length).to.equal(2);
  });

  it('should digest based on batchkey within time interval', async function () {
    const date = new Date();
    clock.setSystemTime(date);
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: ChannelTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnit.MINUTES,
            amount: 5,
            batchkey: 'id',
          },
        },
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload: {
          customVar: 'Testing of User Name',
          id,
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload: {
          customVar: 'digest',
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload: {
          customVar: 'haj',
          id,
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await awaitRunningJobs();
    clock.tick(1000 * 60 * 6);

    const jobs = await jobRepository.find({
      _templateId: template._id,
    });
    const digestJob = jobs.find((job) => job?.digest?.batchkey === 'id');
    expect(digestJob).not.be.undefined;
    const jobsWithEvents = jobs.filter((item) => item.digest.events.length > 0);
    expect(jobsWithEvents.length).to.equal(2);
  });

  it('should digest based on same batchkey within time interval', async function () {
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: ChannelTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnit.MINUTES,
            amount: 5,
            batchkey: 'id',
          },
        },
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload: {
          customVar: 'Testing of User Name',
          id,
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload: {
          customVar: 'digest',
          id: MessageRepository.createObjectId(),
        },
      },
      {
        headers: {
          authorization: `ApiKey ${session.apiKey}`,
        },
      }
    );

    await awaitRunningJobs(1);
    clock.tick(1000 * 60 * 6);

    const jobs = await jobRepository.find({
      _templateId: template._id,
    });
    const digestjobs = jobs.filter((item) => item.digest.events.length > 0);
    expect(digestjobs.length).to.equal(2);
  });
});

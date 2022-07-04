import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';

import { expect } from 'chai';
import { ChannelTypeEnum, DigestUnitEnum } from '@novu/shared';
import axios from 'axios';
import { WorkflowQueueService } from '../services/workflow.queue.service';

const axiosInstance = axios.create();

describe('Trigger event - Digest triggered events - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let workflowQueueService: WorkflowQueueService;
  const messageRepository = new MessageRepository();

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

  const triggerEvent = async (payload) => {
    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        name: template.triggers[0].identifier,
        to: [subscriber.subscriberId],
        payload,
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
    workflowQueueService = session.testServer.getService(WorkflowQueueService);
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
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
          },
        },
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await triggerEvent({
      customVar: 'digest',
    });

    const delayedJob = await jobRepository.findOne({
      _templateId: template._id,
      type: ChannelTypeEnum.DIGEST,
    });

    await awaitRunningJobs(2);
    await workflowQueueService.work(delayedJob);

    const jobs = await jobRepository.find({
      _templateId: template._id,
    });

    const digestJob = jobs.find((job) => job.step.template.type === ChannelTypeEnum.DIGEST);
    expect(digestJob.digest.amount).to.equal(5);
    expect(digestJob.digest.unit).to.equal(DigestUnitEnum.MINUTES);
    const job = jobs.find((item) => item.digest.events.length > 0);

    expect(job.digest?.events?.length).to.equal(2);
  });

  it('should digest based on batchkey within time interval', async function () {
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
            unit: DigestUnitEnum.MINUTES,
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

    await triggerEvent({
      customVar: 'Testing of User Name',
      id,
    });

    await triggerEvent({
      customVar: 'digest',
    });

    await triggerEvent({
      customVar: 'haj',
      id,
    });

    await awaitRunningJobs(3);
    const delayedJob = await jobRepository.findOne({
      _templateId: template._id,
      type: ChannelTypeEnum.DIGEST,
    });
    await workflowQueueService.work(delayedJob);

    const jobs = await jobRepository.find({
      _templateId: template._id,
    });
    const digestJob = jobs.find((job) => job?.digest?.batchkey === 'id');
    expect(digestJob).not.be.undefined;
    const jobsWithEvents = jobs.filter((item) => item.digest.events.length > 0);
    expect(jobsWithEvents.length).to.equal(1);
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
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            batchkey: 'id',
          },
        },
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
      id,
    });

    await triggerEvent({
      customVar: 'digest',
      id: MessageRepository.createObjectId(),
    });

    await awaitRunningJobs(3);
    const delayedJob = await jobRepository.findOne({
      _templateId: template._id,
      type: ChannelTypeEnum.DIGEST,
    });
    await workflowQueueService.work(delayedJob);
    const jobs = await jobRepository.find({
      _templateId: template._id,
    });
    const digestjobs = jobs.find((item) => item.digest.events.length > 0);
    await workflowQueueService.work(digestjobs);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: ChannelTypeEnum.SMS,
    });

    const message = messages[2];

    expect(message.content).to.equal('Hello world 1');
  });

  it('should digest delayed events', async function () {
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
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
          },
        },
        {
          type: ChannelTypeEnum.SMS,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await awaitRunningJobs(0);

    const jobs = await jobRepository.find({
      _templateId: template._id,
      status: {
        $ne: JobStatusEnum.COMPLETED,
      },
    });

    expect(jobs.length).to.equal(0);
  });
});

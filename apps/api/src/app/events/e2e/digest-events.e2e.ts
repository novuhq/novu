import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';

import { expect } from 'chai';
import { StepTypeEnum, DigestTypeEnum, DigestUnitEnum } from '@novu/shared';
import axios from 'axios';
import { WorkflowQueueService } from '../services/workflow.queue.service';
import { SendMessage } from '../usecases/send-message/send-message.usecase';
import { QueueNextJob } from '../usecases/queue-next-job/queue-next-job.usecase';
import { StorageHelperService } from '../services/storage-helper-service/storage-helper.service';
import { RunJob } from '../usecases/run-job/run-job.usecase';
import { RunJobCommand } from '../usecases/run-job/run-job.command';

const axiosInstance = axios.create();

describe('Trigger event - Digest triggered events - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let workflowQueueService: WorkflowQueueService;
  const messageRepository = new MessageRepository();
  let runJob: RunJob;

  const awaitRunningJobs = async (unfinishedJobs = 0) => {
    let runningJobs = 0;
    do {
      runningJobs = await jobRepository.count({
        _environmentId: session.environment._id,
        type: {
          $nin: [StepTypeEnum.DIGEST],
        },
        _templateId: template._id,
        status: {
          $in: [JobStatusEnum.PENDING, JobStatusEnum.QUEUED, JobStatusEnum.RUNNING],
        },
      });
    } while (runningJobs > unfinishedJobs);
  };

  const triggerEvent = async (payload, transactionId?: string) => {
    await axiosInstance.post(
      `${session.serverUrl}/v1/events/trigger`,
      {
        transactionId,
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

    runJob = new RunJob(
      jobRepository,
      session.testServer.getService(SendMessage),
      session.testServer.getService(QueueNextJob),
      session.testServer.getService(StorageHelperService)
    );
  });

  it('should digest events within time interval', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DigestTypeEnum.REGULAR,
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
    });

    await triggerEvent({
      customVar: 'digest',
    });

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(delayedJob).to.be.ok;

    await awaitRunningJobs(2);

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: {
        $nin: [JobStatusEnum.CANCELED],
      },
    });

    const digestJob = jobs.find((job) => job.step.template.type === StepTypeEnum.DIGEST);
    expect(digestJob.digest.amount).to.equal(5);
    expect(digestJob.digest.unit).to.equal(DigestUnitEnum.MINUTES);
    const job = jobs.find((item) => item.digest.events.length > 0);
    expect(job.digest?.events?.length).to.equal(2);
  });

  it('should not have digest prop when not running a digest', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await awaitRunningJobs(0);

    const message = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(message[0].content).to.include('NO_DIGEST_PROP');
    expect(message[0].content).to.not.include('HAS_DIGEST_PROP');
  });

  it('should add a digest prop to template compilation', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{#if step.digest}} HAS_DIGEST_PROP {{/if}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await awaitRunningJobs(1);

    await triggerEvent({
      customVar: 'digest',
    });

    await awaitRunningJobs(1);

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
      status: JobStatusEnum.DELAYED,
    });

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    await awaitRunningJobs(0);

    const message = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    expect(message[0].content).to.include('HAS_DIGEST_PROP');
  });

  it('should digest based on digestKey within time interval', async function () {
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
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
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });
    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
    });
    const digestJob = jobs.find((job) => job?.digest?.digestKey === 'id');
    expect(digestJob).not.be.undefined;
    const jobsWithEvents = jobs.filter((item) => item.digest.events.length > 0);
    expect(jobsWithEvents.length).to.equal(1);
  });

  it('should digest based on same digestKey within time interval', async function () {
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
      id,
    });

    await awaitRunningJobs(1);

    await triggerEvent({
      customVar: 'Testing of User Name',
      id,
    });

    await triggerEvent({
      customVar: 'digest',
      id: 'second-batch',
    });
    await awaitRunningJobs(2);

    const delayedJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(delayedJobs.length).to.equal(2);

    for (const job of delayedJobs) {
      await runJob.execute(
        RunJobCommand.create({
          jobId: job._id,
          environmentId: job._environmentId,
          organizationId: job._organizationId,
          userId: job._userId,
        })
      );
    }

    await awaitRunningJobs(0);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
    });

    const firstBatch = messages.find((message) => (message.content as string).includes('Hello world 2'));
    const secondBatch = messages.find((message) => (message.content as string).includes('Hello world 1'));

    expect(firstBatch).to.be.ok;
    expect(secondBatch).to.be.ok;

    expect(messages.length).to.equal(2);
  });

  it('should digest delayed events', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 1,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await awaitRunningJobs(0);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: {
        $ne: JobStatusEnum.COMPLETED,
      },
    });

    expect(jobs.length).to.equal(0);
  });

  it('should be able to cancel digest', async function () {
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{customVar}}' as string,
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'id',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent(
      {
        customVar: 'Testing of User Name',
      },
      id
    );

    try {
      await triggerEvent(
        {
          customVar: 'Testing of User Name',
        },
        id
      );
      expect(true).to.equal(false);
    } catch (e) {
      expect(e.response.data.message).to.equal(
        'transactionId property is not unique, please make sure all triggers have a unique transactionId'
      );
    }

    await awaitRunningJobs(1);
    await axiosInstance.delete(`${session.serverUrl}/v1/events/trigger/${id}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    let delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    const pendingJobs = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.PENDING,
      transactionId: id,
    });

    expect(pendingJobs).to.equal(1);

    delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
      transactionId: id,
    });
    expect(delayedJob.status).to.equal(JobStatusEnum.CANCELED);
  });

  xit('should be able to update existing message on the in-app digest', async function () {
    const id = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            updateMode: true,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent(
      {
        customVar: 'Testing of User Name',
      },
      id
    );
    await awaitRunningJobs(1);

    const oldMessage = await messageRepository.findOne({
      _environmentId: session.environment._id,
      channel: StepTypeEnum.IN_APP,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
      transactionId: id,
    });

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    await awaitRunningJobs(0);

    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      channel: StepTypeEnum.IN_APP,
      _templateId: template._id,
    } as any);

    expect(oldMessage.content).to.equal('Hello world 0');
    expect(message.content).to.equal('Hello world 2');
  });

  it('should digest with backoff strategy', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.MINUTES,
            backoffAmount: 5,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await awaitRunningJobs(0);

    await triggerEvent({
      customVar: 'digest',
    });

    await awaitRunningJobs(1);
    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    const pendingJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: {
        $nin: [JobStatusEnum.COMPLETED, JobStatusEnum.DELAYED, JobStatusEnum.CANCELED],
      },
    });

    expect(pendingJobs.length).to.equal(1);
    const pendingJob = pendingJobs[0];

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );
    await awaitRunningJobs(0);
    const job = await jobRepository.findById(pendingJob._id);

    expect(job.digest.events.length).to.equal(1);
    expect(job.digest.events[0].customVar).to.equal('digest');
  });

  xit('should digest with backoff strategy and update mode', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 30,
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.SECONDS,
            backoffAmount: 10,
            updateMode: true,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'first',
    });

    await awaitRunningJobs(0);

    await triggerEvent({
      customVar: 'second',
    });

    await awaitRunningJobs(0);

    let messageCount = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
    } as any);

    expect(messageCount.length).to.equal(2);

    await triggerEvent({
      customVar: 'third',
    });

    await awaitRunningJobs(1);
    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    await awaitRunningJobs(0);

    messageCount = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });

    expect(messageCount.length).to.equal(2);
    const job = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.IN_APP,
      transactionId: delayedJob.transactionId,
    });

    expect(job.digest.events[0].customVar).to.equal('second');
    expect(job.digest.events[1].customVar).to.equal('third');
  });

  xit('should digest with regular strategy and update mode', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 30,
            type: DigestTypeEnum.REGULAR,
            updateMode: true,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'first',
    });

    await triggerEvent({
      customVar: 'second',
    });

    await triggerEvent({
      customVar: 'third',
    });

    await awaitRunningJobs(0);
    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    await awaitRunningJobs(0);

    const messageCount = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });

    expect(messageCount.length).to.equal(1);
    const job = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.IN_APP,
      transactionId: delayedJob.transactionId,
    });

    expect(job.digest.events.length).to.equal(3);
  });

  it('should create multiple digest based on different digestKeys', async function () {
    const postId = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'postId',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{postId}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
      postId,
    });

    await triggerEvent({
      customVar: 'digest',
      postId: MessageRepository.createObjectId(),
    });

    let digests = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(digests[0].payload.postId).not.to.equal(digests[1].payload.postId);
    expect(digests.length).to.equal(2);

    await awaitRunningJobs(2);

    digests = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    for (const digest of digests) {
      await runJob.execute(
        RunJobCommand.create({
          jobId: digest._id,
          environmentId: digest._environmentId,
          organizationId: digest._organizationId,
          userId: digest._userId,
        })
      );
    }

    await awaitRunningJobs(0);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });

    expect(messages[0].content).to.include(digests[0].payload.postId);
    expect(messages[1].content).to.include(digests[1].payload.postId);
    const jobCount = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
    });
    expect(jobCount).to.equal(6);
  });

  it('should create multiple digest based on different digestKeys with backoff', async function () {
    const postId = MessageRepository.createObjectId();
    const postId2 = MessageRepository.createObjectId();
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'postId',
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.MINUTES,
            backoffAmount: 5,
          },
        },
        {
          type: StepTypeEnum.SMS,
          content: 'Hello world {{postId}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'first',
      postId,
    });

    await triggerEvent({
      customVar: 'second',
      postId: postId2,
    });

    await triggerEvent({
      customVar: 'fourth',
      postId,
    });

    await triggerEvent({
      customVar: 'third',
      postId: postId2,
    });

    await awaitRunningJobs(2);

    let digests = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(digests[0].payload.postId).not.to.equal(digests[1].payload.postId);
    expect(digests.length).to.equal(2);

    digests = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    for (const digest of digests) {
      await runJob.execute(
        RunJobCommand.create({
          jobId: digest._id,
          environmentId: digest._environmentId,
          organizationId: digest._organizationId,
          userId: digest._userId,
        })
      );
    }

    await awaitRunningJobs(0);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });

    expect(messages.length).to.equal(4);

    const contents: string[] = messages
      .map((message) => message.content)
      .reduce((prev, content: string) => {
        if (prev.includes(content)) {
          return prev;
        }
        prev.push(content);

        return prev;
      }, [] as string[]);

    expect(contents).to.include(`Hello world ${postId}`);
    expect(contents).to.include(`Hello world ${postId2}`);

    const jobCount = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
    });

    expect(jobCount).to.equal(10);
  });

  it('should add a digest prop to chat template compilation', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.CHAT,
          content: 'Hello world {{#if step.digest}} HAS_DIGEST_PROP {{/if}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await awaitRunningJobs(1);

    await triggerEvent({
      customVar: 'digest',
    });

    await awaitRunningJobs(1);

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    await awaitRunningJobs(0);

    const message = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.CHAT,
    });

    expect(message[0].content).to.include('HAS_DIGEST_PROP');
  });

  it('should add a digest prop to push template compilation', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.PUSH,
          title: 'Hello world {{#if step.digest}} HAS_DIGEST_PROP {{/if}}',
          content: 'Hello world {{#if step.digest}} HAS_DIGEST_PROP {{/if}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    await awaitRunningJobs(1);

    await triggerEvent({
      customVar: 'digest',
    });

    await awaitRunningJobs(1);

    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
      status: JobStatusEnum.DELAYED,
    });

    await runJob.execute(
      RunJobCommand.create({
        jobId: delayedJob._id,
        environmentId: delayedJob._environmentId,
        organizationId: delayedJob._organizationId,
        userId: delayedJob._userId,
      })
    );

    await awaitRunningJobs(0);

    const message = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.PUSH,
    });

    expect(message[0].content).to.include('HAS_DIGEST_PROP');
  });
});

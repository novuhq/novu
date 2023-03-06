import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
} from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum, DigestUnitEnum } from '@novu/shared';
import { UserSession, SubscribersService } from '@novu/testing';
import axios from 'axios';
import { expect } from 'chai';
import { AwaitHelpers } from './await-helpers';

import { WorkflowQueueService } from '../services/workflow-queue/workflow.queue.service';

const axiosInstance = axios.create();

describe('Trigger event - Digest triggered events - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let workflowQueueService: WorkflowQueueService;
  const messageRepository = new MessageRepository();
  let awaitHelpers: AwaitHelpers;

  const triggerEvent = async (payload, transactionId?: string): Promise<void> => {
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
    workflowQueueService = session.testServer?.getService(WorkflowQueueService);
    awaitHelpers = new AwaitHelpers(jobRepository, undefined, messageRepository, workflowQueueService);
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

    await session.awaitRunningJobs(template?._id, false, 1);

    const initialJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(initialJobs.length).to.eql(1);

    const delayedJobs = initialJobs.filter((elem) => elem.delay > 0);
    expect(delayedJobs.length).to.eql(1);

    const delayedJob = delayedJobs[0];

    expect(delayedJob).to.be.ok;

    await workflowQueueService.promoteJob(delayedJob._id);
    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: {
        $nin: [JobStatusEnum.CANCELED],
      },
    });

    const digestJob = jobs.find((job) => job.step?.template?.type === StepTypeEnum.DIGEST);
    expect(digestJob?.digest?.amount).to.equal(5);
    expect(digestJob?.digest?.unit).to.equal(DigestUnitEnum.MINUTES);
    const job = jobs.find((item) => item.digestedNotificationIds?.length && item.digestedNotificationIds.length > 0);
    expect(job?.digestedNotificationIds.length).to.equal(2);
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

    await session.awaitRunningJobs(template?._id, false, 0);

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
    await triggerEvent({
      customVar: 'digest',
    });

    const jobs = await awaitHelpers.awaitAndGetJobs(template, 1, StepTypeEnum.DIGEST);

    expect(jobs.length).to.eql(1);

    await awaitHelpers.promoteJob(jobs[0]._id);
    const message = await awaitHelpers.awaitAndGetMessages(template, 1);

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

    const jobs = await awaitHelpers.awaitAndGetJobs(template, 5);
    expect(jobs.length).to.eql(5);
    for (const job of jobs) await awaitHelpers.promoteJob(job._id);
    const finalJobs = await awaitHelpers.awaitAndGetJobs(template, 7);

    const digestedJobs = finalJobs.filter((job) => job.delay && job.delay > 0);
    expect(digestedJobs.length).to.eql(2);
    const jobsWithEvents = finalJobs.filter(
      (item) => item?.digestedNotificationIds && item.digestedNotificationIds.length > 0
    );
    expect(jobsWithEvents.length).to.equal(4);
  });

  it('should digest based on same digestKey within time interval', async function () {
    const firstDigestKey = MessageRepository.createObjectId();
    const secondDigestKey = MessageRepository.createObjectId();
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
      id: firstDigestKey,
    });

    await session.awaitRunningJobs(template?._id, false, 1);

    await triggerEvent({
      customVar: 'Testing of User Name',
      id: firstDigestKey,
    });

    await triggerEvent({
      customVar: 'digest',
      id: secondDigestKey,
    });
    const jobs = await awaitHelpers.awaitAndGetJobs(template, 2, StepTypeEnum.DIGEST);

    expect(jobs.length).to.equal(2);

    for (const job of jobs) {
      await awaitHelpers.promoteJob(job._id);
    }

    const messages = await awaitHelpers.awaitAndGetMessages(template, 2);

    const firstDigestKeyBatch = messages.filter((message) => (message.content as string).includes('Hello world 2'));
    const secondDigestKeyBatch = messages.filter((message) => (message.content as string).includes('Hello world 1'));

    expect(firstDigestKeyBatch.length).to.eql(1);
    expect(secondDigestKeyBatch.length).to.eql(1);

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

    const jobs = await awaitHelpers.awaitAndGetJobs(template, 2);
    expect(jobs.length).to.equal(2);
    const digestJobs = jobs.filter((job) => job.delay > 0);
    expect(digestJobs.length).to.equal(1);
    await awaitHelpers.promoteJob(digestJobs[0]._id);
    const messages = await awaitHelpers.awaitAndGetMessages(template, 2);
    expect(messages.length).to.equals(2);
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

    const jobs = await awaitHelpers.awaitAndGetJobs(template, 2);
    expect(jobs.length).to.equal(2);
    await axiosInstance.delete(`${session.serverUrl}/v1/events/trigger/${id}`, {
      headers: {
        authorization: `ApiKey ${session.apiKey}`,
      },
    });

    const digestJobs = await awaitHelpers.awaitAndGetJobs(template, 1, StepTypeEnum.DIGEST);
    expect(digestJobs.length).to.eql(1);

    await workflowQueueService.promoteJob(digestJobs[0]._id);

    const pendingJobs = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.PENDING,
      transactionId: id,
    });

    expect(pendingJobs).to.equal(0);

    const cancelledDigestJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: JobStatusEnum.CANCELED,
      type: StepTypeEnum.DIGEST,
      transactionId: id,
    });

    expect(cancelledDigestJobs.length).to.eql(1);
  });

  it('should be able to update existing message on the in-app digest', async function () {
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
    await session.awaitRunningJobs(template?._id, false, 0);
    await triggerEvent({
      customVar: 'Testing of User Name',
    });

    const digestJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
      transactionId: id,
    });

    expect(digestJobs.length).to.eql(1);
    await awaitHelpers.awaitForDigest(digestJobs[0]._id, 2);
    await workflowQueueService.promoteJob(digestJobs[0]._id);
    const messages = await awaitHelpers.awaitAndGetMessages(template, 2);
    expect(messages.length).to.equal(2);
    expect(messages[0].content).to.equal('Hello world 2');
    expect(messages[1].content).to.equal('Hello world 2');
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
    await triggerEvent({
      customVar: 'digest',
    });
    const digestJobs = await awaitHelpers.awaitAndGetJobs(template, 1, StepTypeEnum.DIGEST);

    expect(digestJobs.length).to.eql(1);
    await awaitHelpers.promoteJob(digestJobs[0]._id);
  });

  it('should digest with backoff strategy and update mode', async function () {
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

    await session.awaitRunningJobs(template?._id, false, 0);

    await triggerEvent({
      customVar: 'second',
    });

    await session.awaitRunningJobs(template?._id, false, 0);

    const messageCount = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
    });

    expect(messageCount.length).to.equal(1);

    await triggerEvent({
      customVar: 'third',
    });

    await session.awaitRunningJobs(template?._id, false, 0);
    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    await workflowQueueService.promoteJob(delayedJob._id);
    const messages = await awaitHelpers.awaitAndGetMessages(template, 2);

    expect(messages.length).to.equal(2);
    const job = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.IN_APP,
      transactionId: delayedJob.transactionId,
    });
  });

  it('should digest with regular strategy and update mode', async function () {
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

    await session.awaitRunningJobs(template?._id, false, 0);
    const delayedJob = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    await workflowQueueService.promoteJob(delayedJob._id);
    const messages = await awaitHelpers.awaitAndGetMessages(template, 1);
    expect(messages.length).to.equal(1);

    const job = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.IN_APP,
      transactionId: delayedJob.transactionId,
    });
    expect(job?.digestedNotificationIds?.length).to.equal(3);
  });

  it('should create multiple digest based on different digestKeys', async function () {
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
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{postId}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'No digest key',
    });
    await triggerEvent({
      customVar: 'digest key1',
      postId,
    });
    await triggerEvent({
      customVar: 'digest key2',
      postId: postId2,
    });
    await triggerEvent({
      customVar: 'No digest key repeat',
    });
    await triggerEvent({
      customVar: 'digest key1 repeat',
      postId,
    });

    const digests = await awaitHelpers.awaitAndGetJobs(template, 3, StepTypeEnum.DIGEST);

    expect(digests.length).to.equal(3);

    for (const digest of digests) {
      await awaitHelpers.promoteJob(digest._id);
    }
    const messages = await awaitHelpers.awaitAndGetMessages(template, 3);
    expect(messages.length).to.eql(3);

    const jobs = await awaitHelpers.awaitAndGetJobs(template, 6);
    expect(jobs.length).to.equal(6);
  });

  it('should create multiple digests based on different nested digestKeys', async function () {
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
            digestKey: 'nested.postId',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{nested.postId}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'No digest key',
    });

    await triggerEvent({
      customVar: 'digest key1',
      nested: { postId },
    });

    await triggerEvent({
      customVar: 'digest key2',
      nested: { postId: postId2 },
    });
    await triggerEvent({
      customVar: 'No digest key repeat',
    });
    await triggerEvent({
      customVar: 'digest key1 repeat',
      nested: { postId: postId },
    });

    const digests = await awaitHelpers.awaitAndGetJobs(template, 3);

    expect(digests.length).to.eql(3);
    expect(digests[0].payload.nested?.postId).to.equal(undefined);
    expect(digests[1].payload?.nested?.postId).not.to.equal(digests[2].payload?.nested?.postId);

    for (const digest of digests) {
      await awaitHelpers.promoteJob(digest._id);
    }

    await session.awaitRunningJobs(template?._id, false, 0);

    const messages = await awaitHelpers.awaitAndGetMessages(template, 3);
    expect(messages.length).to.eql(3);
    const totalJobs = await awaitHelpers.awaitAndGetJobs(template, 3);

    expect(totalJobs.length).to.equal(6);
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
          type: StepTypeEnum.CHAT,
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
      postId,
    });

    await triggerEvent({
      customVar: 'third',
    });

    await triggerEvent({
      customVar: 'fourth',
      postId: postId2,
    });

    await triggerEvent({
      customVar: 'fifth',
      postId: postId2,
    });

    await triggerEvent({
      customVar: 'sixth',
    });
    await session.awaitRunningJobs(template?._id, false, 0);

    const digests = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(digests.length).to.equal(3);
    expect(digests[0]?.payload.postId).not.to.equal(digests[1]?.payload.postId);
    expect(digests[2]?.payload.postId).to.equal(undefined);

    for (const digest of digests) {
      await workflowQueueService.promoteJob(digest._id);
    }
    const messages = await awaitHelpers.awaitAndGetMessages(template, 6);
    expect(messages.length).to.equal(6);

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
    expect(jobCount).to.equal(9);
  });

  it('should create multiple digests based on different nested digestKeys with backoff', async function () {
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
            digestKey: 'nested.postId',
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.MINUTES,
            backoffAmount: 5,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{nested.postId}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'first',
      nested: { postId },
    });
    await session.awaitParsingEvents();

    await triggerEvent({
      customVar: 'second',
      nested: { postId },
    });
    await session.awaitParsingEvents();

    await triggerEvent({
      customVar: 'third',
    });
    await session.awaitParsingEvents();

    await triggerEvent({
      customVar: 'fourth',
      nested: { postId: postId2 },
    });
    await session.awaitParsingEvents();

    await triggerEvent({
      customVar: 'fifth',
      nested: { postId: postId2 },
    });
    await session.awaitParsingEvents();

    await triggerEvent({
      customVar: 'sixth',
    });
    await session.awaitParsingEvents();

    await session.awaitRunningJobs(template?._id, false, 0);

    const digests = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(digests.length).to.equal(3);
    expect(digests[0].payload?.nested?.postId).not.to.equal(digests[1].payload?.nested?.postId);

    for (const digest of digests) {
      await workflowQueueService.promoteJob(digest._id);
    }
    const messages = await awaitHelpers.awaitAndGetMessages(template, 6);
    expect(messages.length).to.equal(6);

    const jobCount = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
    });
    expect(jobCount).to.equal(9);
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
          type: StepTypeEnum.IN_APP,
          content:
            'Total events in digest:{{step.total_count}} Hello world {{#if step.digest}} HAS_DIGEST_PROP {{/if}}' as string,
        },
      ],
    });

    await triggerEvent({
      customVar: 'Testing of User Name',
    });
    await triggerEvent({
      customVar: 'digest',
    });

    const jobs = await awaitHelpers.awaitAndGetJobs(template, 1, StepTypeEnum.DIGEST);
    expect(jobs.length).to.eql(1);
    await awaitHelpers.awaitForDigest(jobs[0]._id, 2);
    await awaitHelpers.promoteJob(jobs[0]._id);
    const message = await awaitHelpers.awaitAndGetMessages(template, 1);
    expect(message[0].content).to.include('HAS_DIGEST_PROP');
    expect(message[0].content).to.include('Total events in digest:2');
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
    await triggerEvent({
      customVar: 'digest',
    });

    const jobs = await awaitHelpers.awaitAndGetJobs(template, 1, StepTypeEnum.DIGEST);

    expect(jobs.length).to.eql(1);

    await awaitHelpers.promoteJob(jobs[0]._id);

    const message = await awaitHelpers.awaitAndGetMessages(template, 1);

    expect(message[0].content).to.include('HAS_DIGEST_PROP');
  });

  it('should merge digest events accordingly when concurrent calls with backoff', async () => {
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
          type: StepTypeEnum.CHAT,
          content:
            'Total events in digest:{{step.total_count}} Hello world {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
      ],
    });
    await Promise.all(
      Array.from(Array(10).keys()).map(async (index) => {
        await triggerEvent({
          customVar: `concurrent-call-${index}`,
        });
      })
    );
    const jobs = await awaitHelpers.awaitAndGetJobs(template, 2);
    expect(jobs.length).to.eql(2);
    let messages = await awaitHelpers.awaitAndGetMessages(template, 1);
    expect(messages.length).to.equal(1);
    expect(messages[0].content).to.include('NO_DIGEST_PROP');
    const digestJob = jobs.find((job) => job.type === StepTypeEnum.DIGEST);
    await awaitHelpers.promoteJob(digestJob._id);
    messages = await awaitHelpers.awaitAndGetMessages(template, 2);
    expect(messages.length).to.equal(2);
    expect(messages[1].content).to.include('HAS_DIGEST_PROP');
    expect(messages[1].content).to.include('Total events in digest:9');
  });

  it('should send only backoff messages with out digest', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'digestKey',
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.MINUTES,
            backoffAmount: 5,
          },
        },
        {
          type: StepTypeEnum.CHAT,
          content:
            'Total events in digest:{{step.total_count}} Hello world {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
      ],
    });
    await Promise.all(
      Array.from(Array(10).keys()).map(async (index) => {
        await triggerEvent({
          customVar: `concurrent-call-${index}`,
          digestKey: `digestValue${index}`,
        });
      })
    );
    const jobs = await awaitHelpers.awaitAndGetJobs(template, 10);
    expect(jobs.length).to.eql(10);
    const digestJobs = jobs.filter((job) => job.type === StepTypeEnum.DIGEST);
    expect(digestJobs.length).to.equal(0);
    const messages = await awaitHelpers.awaitAndGetMessages(template, 10);
    expect(messages.length).to.equal(10);
    for (const message of messages) expect(message.content).to.include('NO_DIGEST_PROP');
  });

  it('should merge digest events accordingly when concurrent calls with backoff and digest key', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'digestKey',
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.MINUTES,
            backoffAmount: 5,
          },
        },
        {
          type: StepTypeEnum.CHAT,
          content:
            'Total events in digest:{{step.total_count}} Hello world {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
      ],
    });
    await Promise.all(
      Array.from(Array(10).keys()).map(async (index) => {
        await triggerEvent({
          customVar: `concurrent-call-${index}`,
          digestKey: `digestValue${index % 2}`,
        });
      })
    );
    let jobs = await awaitHelpers.awaitAndGetJobs(template, 4);
    expect(jobs.length).to.eql(4);
    let messages = await awaitHelpers.awaitAndGetMessages(template, 2);
    expect(messages.length).to.equal(2);
    for (const message of messages) expect(message.content).to.include('NO_DIGEST_PROP');

    const digestJobs = jobs.filter((job) => job.type === StepTypeEnum.DIGEST);
    expect(digestJobs.length).to.equal(2);
    for (const digestJob of digestJobs) await awaitHelpers.promoteJob(digestJob._id);
    jobs = await awaitHelpers.awaitAndGetJobs(template, 6);
    expect(jobs.length).to.eql(6);
    messages = await awaitHelpers.awaitAndGetMessages(template, 4);
    expect(messages.length).to.equal(4);
    messages = messages.filter(({ content }) => content.toString().includes('HAS_DIGEST_PROP'));
    expect(messages.length).to.equal(2);
    for (const message of messages) expect(message.content).to.include('Total events in digest:4');
  });

  it('should test, regular steps, multiple digest steps with backoff and regular digest, concurrent calls', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.SMS,
          content: 'Before digest node {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'digestKey1',
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.MINUTES,
            backoffAmount: 5,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content:
            'events in digest:{{step.total_count}} After 1st digest {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'digestKey2',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.CHAT,
          content:
            'events in digest:{{step.total_count}} After 2nd digest {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'digestKey3',
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.MINUTES,
            backoffAmount: 5,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content:
            'events in digest:{{step.total_count}} After 3rd digest {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
      ],
    });

    /*
     *Total 30 events, expected 30 regular messages for before digest step, total 6 digest nodes,
     *1st digest step(with backoff) should generate 2 regular messages, 2 digest messages,
     *2nd digest(with out backoff) should generate 2 digest messages and
     *3rd  digest with backoff should generate 2 regular and 2 digest messages.
     *total expected jobs: 46 jobs, total messages: 30 + 4 backoff + 6 digest
     */

    await Promise.all(
      Array.from(Array(30).keys()).map(async (index) => {
        await triggerEvent({
          customVar: `concurrent-call-${index}`,
          digestKey1: `digestValue${index % 2}`,
          digestKey2: `digestValue${index % 2}`,
          digestKey3: `digestValue${index % 2}`,
        });
      })
    );
    let jobs = await awaitHelpers.awaitAndGetJobs(template, 40);
    expect(jobs.length).to.eql(40);
    let messages = await awaitHelpers.awaitAndGetMessages(template, 34);
    expect(messages.length).to.equal(34);
    for (const message of messages) expect(message.content).to.include('NO_DIGEST_PROP');

    const digestJobs = jobs.filter((job) => job.type === StepTypeEnum.DIGEST);
    expect(digestJobs.length).to.equal(6);
    for (const digestJob of digestJobs) await awaitHelpers.promoteJob(digestJob._id);
    jobs = await awaitHelpers.awaitAndGetJobs(template, 46);
    expect(jobs.length).to.eql(46);
    messages = await awaitHelpers.awaitAndGetMessages(template, 40);
    expect(messages.length).to.equal(40);
    messages = messages.filter(({ content }) => content.toString().includes('HAS_DIGEST_PROP'));
    expect(messages.length).to.equal(6);
    const firstDigestMessages = messages.filter(
      (message) => message._messageTemplateId === template.steps[2].template._id
    );
    expect(firstDigestMessages.length).to.equal(2);
    for (const message of firstDigestMessages) expect(message.content).to.include('events in digest:14');
    const secondDigestMessages = messages.filter(
      (message) => message._messageTemplateId === template.steps[4].template._id
    );
    expect(secondDigestMessages.length).to.equal(2);
    for (const message of secondDigestMessages) expect(message.content).to.include('events in digest:15');

    const thirdDigestMessages = messages.filter(
      (message) => message._messageTemplateId === template.steps[6].template._id
    );
    expect(thirdDigestMessages.length).to.equal(2);
    for (const message of thirdDigestMessages) expect(message.content).to.include('events in digest:14');
  });

  it('should test, regular steps, multiple digest steps with backoff and regular digest, sequential calls', async () => {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.SMS,
          content: 'Before digest node {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'digestKey1',
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.MINUTES,
            backoffAmount: 5,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content:
            'events in digest:{{step.total_count}} After 1st digest {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'digestKey2',
            type: DigestTypeEnum.REGULAR,
          },
        },
        {
          type: StepTypeEnum.CHAT,
          content:
            'events in digest:{{step.total_count}} After 2nd digest {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.MINUTES,
            amount: 5,
            digestKey: 'digestKey3',
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.MINUTES,
            backoffAmount: 5,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content:
            'events in digest:{{step.total_count}} After 3rd digest {{#if step.digest}} HAS_DIGEST_PROP {{else}} NO_DIGEST_PROP {{/if}}',
        },
      ],
    });

    /*
     *Total 30 events, expected 30 regular messages for before digest step, total 6 digest nodes,
     *1st digest step(with backoff) should generate 2 regular messages, 2 digest messages,
     *2nd digest(with out backoff) should generate 2 digest messages and
     *3rd  digest with backoff should generate 2 regular and 2 digest messages.
     *total expected jobs: 46 jobs, total messages 40: 30 + 4 backoff + 6 digest
     */

    for (let index = 0; index < 30; index++) {
      await triggerEvent({
        customVar: `sequential-call-${index}`,
        digestKey1: `digestValue${index % 2}`,
        digestKey2: `digestValue${index % 2}`,
        digestKey3: `digestValue${index % 2}`,
      });
    }
    let jobs = await awaitHelpers.awaitAndGetJobs(template, 40);
    expect(jobs.length).to.eql(40);
    let messages = await awaitHelpers.awaitAndGetMessages(template, 34);
    expect(messages.length).to.equal(34);
    for (const message of messages) expect(message.content).to.include('NO_DIGEST_PROP');

    const digestJobs = jobs.filter((job) => job.type === StepTypeEnum.DIGEST);
    expect(digestJobs.length).to.equal(6);
    for (const digestJob of digestJobs) await awaitHelpers.promoteJob(digestJob._id);
    jobs = await awaitHelpers.awaitAndGetJobs(template, 46);
    expect(jobs.length).to.eql(46);
    messages = await awaitHelpers.awaitAndGetMessages(template, 40);
    expect(messages.length).to.equal(40);
    messages = messages.filter(({ content }) => content.toString().includes('HAS_DIGEST_PROP'));
    expect(messages.length).to.equal(6);
    const firstDigestMessages = messages.filter(
      (message) => message._messageTemplateId === template.steps[2].template._id
    );
    expect(firstDigestMessages.length).to.equal(2);
    for (const message of firstDigestMessages) expect(message.content).to.include('events in digest:14');
    const secondDigestMessages = messages.filter(
      (message) => message._messageTemplateId === template.steps[4].template._id
    );
    expect(secondDigestMessages.length).to.equal(2);
    for (const message of secondDigestMessages) expect(message.content).to.include('events in digest:15');

    const thirdDigestMessages = messages.filter(
      (message) => message._messageTemplateId === template.steps[6].template._id
    );
    expect(thirdDigestMessages.length).to.equal(2);
    for (const message of thirdDigestMessages) expect(message.content).to.include('events in digest:14');
  });

  it('should merge digest events accordingly when concurrent calls', async () => {
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
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await Promise.all([
      triggerEvent({
        customVar: 'concurrent-call-1',
      }),
      triggerEvent({
        customVar: 'concurrent-call-2',
      }),
      triggerEvent({
        customVar: 'concurrent-call-3',
      }),
      triggerEvent({
        customVar: 'concurrent-call-4',
      }),
      triggerEvent({
        customVar: 'concurrent-call-5',
      }),
      triggerEvent({
        customVar: 'concurrent-call-6',
      }),
      triggerEvent({
        customVar: 'concurrent-call-7',
      }),
      triggerEvent({
        customVar: 'concurrent-call-8',
      }),
      triggerEvent({
        customVar: 'concurrent-call-9',
      }),
      triggerEvent({
        customVar: 'concurrent-call-10',
      }),
    ]);
    const jobs = await awaitHelpers.awaitAndGetJobs(template, 1);
    expect(jobs.length).to.eql(1);
    await awaitHelpers.promoteJob(jobs[0]._id);
    const messages = await awaitHelpers.awaitAndGetMessages(template, 1);
    expect(messages.length).to.equal(1);
  });

  it('should merge digest events accordingly when sequential calls', async () => {
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
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    await triggerEvent({ customVar: 'sequential-calls-1' });
    await triggerEvent({ customVar: 'sequential-calls-2' });
    await triggerEvent({ customVar: 'sequential-calls-3' });
    await triggerEvent({ customVar: 'sequential-calls-4' });
    await triggerEvent({ customVar: 'sequential-calls-5' });
    await triggerEvent({ customVar: 'sequential-calls-6' });
    await triggerEvent({ customVar: 'sequential-calls-7' });
    await triggerEvent({ customVar: 'sequential-calls-8' });
    await triggerEvent({ customVar: 'sequential-calls-9' });
    await triggerEvent({ customVar: 'sequential-calls-10' });

    await session.awaitRunningJobs(template?._id, false, 1);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs.length).to.eql(1);

    const delayedJobs = jobs.filter((elem) => elem.delay !== 0);
    expect(delayedJobs.length).to.eql(1);

    const delayedJob = delayedJobs[0];
    const { updatedAt: delayedJobUpdateTime, payload } = delayedJob;
    expect(delayedJobUpdateTime).to.be.ok;
    expect(payload).to.eql({ customVar: 'sequential-calls-1' });
  });
});

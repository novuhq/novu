/* eslint-disable @typescript-eslint/no-non-null-assertion */
import axios from 'axios';
import { expect } from 'chai';
import { getTime, parseISO } from 'date-fns';
import {
  MessageRepository,
  NotificationTemplateEntity,
  SubscriberEntity,
  JobRepository,
  JobStatusEnum,
  JobEntity,
} from '@novu/dal';
import { StepTypeEnum, DigestTypeEnum, DigestUnitEnum, IDigestRegularMetadata } from '@novu/shared';
import { UserSession, SubscribersService } from '@novu/testing';

const axiosInstance = axios.create();

const promiseTimeout = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe('Trigger event - Digest triggered events - /v1/events/trigger (POST)', function () {
  let session: UserSession;
  let template: NotificationTemplateEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  const messageRepository = new MessageRepository();

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
  });

  it('should digest events within time interval', async function () {
    const digestAmount = 1;
    const digestUnit = DigestUnitEnum.SECONDS;
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
            unit: digestUnit,
            amount: digestAmount,
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

    await session.awaitRunningJobs(template?._id, false, 2);

    const initialJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(initialJobs && initialJobs.length).to.eql(2);

    const delayedJobs = initialJobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs && delayedJobs.length).to.eql(1);
    const mergedJobs = initialJobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs && mergedJobs.length).to.eql(1);

    const delayedJob = delayedJobs[0];

    expect(delayedJob).to.be.ok;

    await session.awaitRunningJobs(template?._id, false, 0);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: {
        $nin: [JobStatusEnum.CANCELED],
      },
    });

    const digestJob = jobs.find((job) => job.step?.template?.type === StepTypeEnum.DIGEST);
    expect((digestJob && (digestJob?.digest as IDigestRegularMetadata))?.amount).to.equal(digestAmount);
    expect((digestJob && (digestJob?.digest as IDigestRegularMetadata))?.unit).to.equal(digestUnit);
    const job = jobs.find((item) => item.digest?.events?.length && item.digest.events.length > 0);
    expect(job && job?.digest?.events?.length).to.equal(2);
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

    expect(message && message[0].content).to.include('NO_DIGEST_PROP');
    expect(message && message[0].content).to.not.include('HAS_DIGEST_PROP');
  });

  it('should add a digest prop to template compilation', async function () {
    template = await session.createTemplate({
      steps: [
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

    await session.awaitRunningJobs(template?._id, false, 0);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs && jobs.length).to.eql(2);

    const completedJob = jobs.find((elem) => elem.status === JobStatusEnum.COMPLETED);
    expect(completedJob).to.ok;
    const mergedJob = jobs.find((elem) => elem.status === JobStatusEnum.MERGED);
    expect(mergedJob).to.ok;

    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
      _notificationId: completedJob?._notificationId,
      _templateId: template._id,
    });

    expect(message && message?.content).to.include('HAS_DIGEST_PROP');
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
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
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

    await session.awaitRunningJobs(template?._id, false, 3);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs && jobs.length).to.eql(3);

    const delayedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs && delayedJobs.length).to.eql(2);
    const mergedJobs = jobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs && mergedJobs.length).to.eql(1);

    await session.awaitRunningJobs(template?._id, false, 1);

    const finalJobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
    });

    const digestedJobs = finalJobs.filter((job) => (job?.digest as IDigestRegularMetadata)?.digestKey === 'id');
    expect(digestedJobs && digestedJobs.length).to.eql(3);

    const jobsWithEvents = finalJobs.filter(
      (item) => item.type === StepTypeEnum.SMS && item?.digest?.events && item.digest.events.length > 0
    );
    expect(jobsWithEvents && jobsWithEvents.length).to.equal(2);
  });

  it('should digest based on same digestKey within time interval', async function () {
    const firstDigestKey = 'digest-key-one';
    const secondDigestKey = 'digest-key-two';
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
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

    await triggerEvent({
      customVar: 'Testing of User Name',
      id: firstDigestKey,
    });

    await triggerEvent({
      customVar: 'digest',
      id: secondDigestKey,
    });

    await session.awaitRunningJobs(template?._id, false, 0);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs && jobs.length).to.equal(3);

    const completedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.COMPLETED);
    expect(completedJobs && completedJobs.length).to.eql(2);
    const mergedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.MERGED);
    expect(mergedJobs && mergedJobs.length).to.eql(1);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.SMS,
      _templateId: template._id,
      _notificationId: {
        $in: completedJobs.map((job) => job._notificationId),
      },
    });

    const firstDigestKeyBatch = messages.filter((message) => (message.content as string).includes('Hello world 2'));
    const secondDigestKeyBatch = messages.filter((message) => (message.content as string).includes('Hello world 1'));

    expect(firstDigestKeyBatch && firstDigestKeyBatch.length).to.eql(1);
    expect(secondDigestKeyBatch && secondDigestKeyBatch.length).to.eql(1);

    expect(messages && messages.length).to.equal(2);
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
            amount: 2,
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

    await session.awaitRunningJobs(template?._id, false, 0);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      status: {
        $ne: JobStatusEnum.COMPLETED,
      },
    });

    expect(jobs && jobs.length).to.equal(0);
  });

  it.skip('should digest with backoff strategy', async function () {
    template = await session.createTemplate({
      steps: [
        {
          type: StepTypeEnum.DIGEST,
          content: '',
          metadata: {
            unit: DigestUnitEnum.SECONDS,
            amount: 5,
            type: DigestTypeEnum.BACKOFF,
            backoffUnit: DigestUnitEnum.SECONDS,
            backoffAmount: 10,
          },
        },
        {
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const events = [
      { customVar: 'Testing of User Name' },
      { customVar: 'digest' },
      { customVar: 'merged' },
      { customVar: 'digest' },
      { customVar: 'merged' },
      { customVar: 'digest' },
      { customVar: 'merged' },
    ];

    await Promise.all(events.map((event) => triggerEvent(event)));

    await session.awaitRunningJobs(template?._id, false, 0);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs && jobs.length).to.eql(7);

    const completedJob = jobs.find((elem) => elem.status === JobStatusEnum.COMPLETED);
    expect(completedJob).to.ok;
    const skippedJob = jobs.find((elem) => elem.status === JobStatusEnum.SKIPPED);
    expect(skippedJob).to.ok;
    const mergedJob = jobs.find((elem) => elem.status === JobStatusEnum.MERGED);
    expect(mergedJob).to.ok;

    const generatedMessageJob = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      type: StepTypeEnum.IN_APP,
    });

    expect(generatedMessageJob && generatedMessageJob.length).to.equal(7);

    const mergedInApp = generatedMessageJob.filter((elem) => elem.status === JobStatusEnum.MERGED);
    expect(mergedInApp && mergedInApp.length).to.equal(5);

    const completedInApp = generatedMessageJob.filter((elem) => elem.status === JobStatusEnum.COMPLETED);
    expect(completedInApp && completedInApp.length).to.equal(2);

    const digestEventLength6 = completedInApp.find((i) => i.digest?.events?.length === 6);
    expect(digestEventLength6).to.be.ok;

    const digestEventLength0 = completedInApp.find((i) => i.digest?.events?.length === 0);
    expect(digestEventLength0).to.be.ok;
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
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
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

    await session.awaitRunningJobs(template?._id, false, 0);

    const digests = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(digests && digests.length).to.equal(5);
    const noPostIdJobs = digests.filter((job) => !job.payload.postId);
    expect(noPostIdJobs && noPostIdJobs.length).to.equal(2);

    const postId1Jobs = digests.filter((job) => job.payload.postId === postId);
    const postId2Jobs = digests.filter((job) => job.payload.postId === postId2);
    const postId1MergedJobs = postId1Jobs.filter((job) => job.status === JobStatusEnum.MERGED);

    expect(postId1MergedJobs && postId1MergedJobs.length).to.equal(1);
    expect(postId1Jobs && postId1Jobs.length).to.equal(2);
    expect(postId2Jobs && postId2Jobs.length).to.equal(1);

    await session.awaitRunningJobs(template?._id, false, 0);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });
    expect(messages && messages.length).to.eql(3);
    const postId1Content = messages.find((message) => (message.content as string).includes(postId));
    const postId2Content = messages.find((message) => (message.content as string).includes(postId2));
    const noDigestKeyContent = messages.find((message) => message.content === 'Hello world ');
    expect(postId1Content).to.be.ok;
    expect(postId2Content).to.be.ok;
    expect(noDigestKeyContent).to.be.ok;

    const jobCount = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
    });
    expect(jobCount).to.equal(15);
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
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
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
      nested: { postId },
    });

    await session.awaitRunningJobs(template?._id, false, 5);

    const digests = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(digests && digests.length).to.eql(5);

    const noPostIdJobs = digests.filter((job) => !job.payload.nested);
    expect(noPostIdJobs && noPostIdJobs.length).to.equal(2);

    const postId1Jobs = digests.filter((job) => job.payload.nested?.postId === postId);
    const postId2Jobs = digests.filter((job) => job.payload.nested?.postId === postId2);
    const postId1MergedJobs = postId1Jobs.filter((job) => job.status === JobStatusEnum.MERGED);

    expect(postId1MergedJobs && postId1MergedJobs.length).to.equal(1);
    expect(postId1Jobs && postId1Jobs.length).to.equal(2);
    expect(postId2Jobs && postId2Jobs.length).to.equal(1);

    await session.awaitRunningJobs(template?._id, false, 0);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });

    expect(messages && messages.length).to.eql(3);
    const postId1Content = messages.find((message) => (message.content as string).includes(postId));
    const postId2Content = messages.find((message) => (message.content as string).includes(postId2));
    const noDigestKeyContent = messages.find((message) => message.content === 'Hello world ');
    expect(postId1Content).to.be.ok;
    expect(postId2Content).to.be.ok;
    expect(noDigestKeyContent).to.be.ok;

    const jobCount = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
    });
    expect(jobCount).to.equal(15);
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
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
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

    await Promise.all([
      triggerEvent({ customVar: 'first', postId }),
      triggerEvent({ customVar: 'second' }),
      triggerEvent({ customVar: 'third', postId: postId2 }),
      triggerEvent({ customVar: 'fourth', postId }),
      triggerEvent({ customVar: 'fifth', postId: postId2 }),
      triggerEvent({ customVar: 'sixth' }),
    ]);

    await session.awaitRunningJobs(template?._id, false, 0);

    const digests = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(digests && digests.length).to.equal(6);

    const completedJobs = digests.filter((job) => job.status === JobStatusEnum.COMPLETED);
    expect(completedJobs && completedJobs.length).to.equal(3);

    const skippedJobs = digests.filter((job) => job.status === JobStatusEnum.SKIPPED);
    expect(skippedJobs && skippedJobs.length).to.equal(3);

    const postId1Jobs = digests.filter((job) => job.payload.postId === postId);
    expect(postId1Jobs && postId1Jobs.length).to.equal(2);

    const postId2Jobs = digests.filter((job) => job.payload.postId === postId2);
    expect(postId2Jobs && postId2Jobs.length).to.equal(2);

    const noPostIdJobs = digests.filter((job) => !job.payload.postId);
    expect(noPostIdJobs && noPostIdJobs.length).to.equal(2);

    await session.awaitRunningJobs(template?._id, false, 0);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });

    expect(messages && messages.length).to.equal(6);

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
    expect(jobCount).to.equal(18);
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
            unit: DigestUnitEnum.SECONDS,
            amount: 2,
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
      nested: { postId: postId },
    });

    await triggerEvent({
      customVar: 'second',
      nested: { postId: postId },
    });

    await triggerEvent({
      customVar: 'third',
    });

    await triggerEvent({
      customVar: 'fourth',
      nested: { postId: postId2 },
    });

    await triggerEvent({
      customVar: 'fifth',
      nested: { postId: postId2 },
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

    expect(digests && digests.length).to.equal(6);

    const completedJobs = digests.filter((job) => job.status === JobStatusEnum.COMPLETED);
    expect(completedJobs && completedJobs.length).to.equal(3);

    const skippedJobs = digests.filter((job) => job.status === JobStatusEnum.SKIPPED);
    expect(skippedJobs && skippedJobs.length).to.equal(3);

    const postId1Jobs = digests.filter((job) => job.payload?.nested?.postId === postId);
    expect(postId1Jobs && postId1Jobs.length).to.equal(2);

    const postId2Jobs = digests.filter((job) => job.payload?.nested?.postId === postId2);
    expect(postId2Jobs && postId2Jobs.length).to.equal(2);

    const noPostIdJobs = digests.filter((job) => !job.payload?.nested?.postId);
    expect(noPostIdJobs && noPostIdJobs.length).to.equal(2);

    const messages = await messageRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
    });
    expect(messages && messages.length).to.equal(6);

    const jobCount = await jobRepository.count({
      _environmentId: session.environment._id,
      _templateId: template._id,
    });
    expect(jobCount).to.equal(18);
  });

  it('should add a digest prop to chat template compilation', async function () {
    template = await session.createTemplate({
      steps: [
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

    await session.awaitRunningJobs(template?._id, false, 0);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs && jobs.length).to.eql(2);

    const completedJob = jobs.find((elem) => elem.status === JobStatusEnum.COMPLETED);
    expect(completedJob).to.ok;
    const mergedJob = jobs.find((elem) => elem.status === JobStatusEnum.MERGED);
    expect(mergedJob).to.ok;

    await session.awaitRunningJobs(template?._id, false, 0);

    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.IN_APP,
      _templateId: template._id,
      _notificationId: completedJob?._notificationId,
    });
    expect(message && message?.content).to.include('HAS_DIGEST_PROP');
    expect(message && message?.content).to.include('Total events in digest:2');
  });

  it('should add a digest prop to push template compilation', async function () {
    template = await session.createTemplate({
      steps: [
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

    await session.awaitRunningJobs(template?._id, false, 0);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      _subscriberId: subscriber._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs && jobs.length).to.eql(2);

    const completedJob = jobs.find((elem) => elem.status === JobStatusEnum.COMPLETED);
    expect(completedJob).to.ok;
    const mergedJob = jobs.find((elem) => elem.status === JobStatusEnum.MERGED);
    expect(mergedJob).to.ok;

    const message = await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: StepTypeEnum.PUSH,
      _templateId: template._id,
      _notificationId: completedJob?._notificationId,
    });

    expect(message && message?.content).to.include('HAS_DIGEST_PROP');
  });

  it('should merge digest events accordingly when concurrent calls', async () => {
    template = await session.createTemplate({
      steps: [
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
          type: StepTypeEnum.IN_APP,
          content: 'Hello world {{step.events.length}}' as string,
        },
      ],
    });

    const result = await Promise.all([
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

    await session.awaitRunningJobs(template?._id, false, 10);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs && jobs.length).to.eql(10);

    const delayedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs && delayedJobs.length).to.eql(1);
    const mergedJobs = jobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs && mergedJobs.length).to.eql(9);

    let delayedJobUpdateTime = delayedJobs[0].updatedAt;
    expect(delayedJobUpdateTime).to.be.ok;

    let delayed = delayedJobs[0];
    do {
      delayed = (await jobRepository.findOne({
        _id: delayedJobs[0]._id,
        _environmentId: session.environment._id,
      })) as JobEntity;
      delayedJobUpdateTime = delayed.updatedAt;
      await promiseTimeout(100);
    } while (delayed.status !== JobStatusEnum.COMPLETED);

    /*
     * As the only one digest job delayed, because it is updated after creation, its update time has to be greater than the other jobs
     * that have been skipped to delay and therefore merged
     */
    for (const mergedJob of mergedJobs) {
      expect(getTime(parseISO(delayedJobUpdateTime))).to.greaterThan(getTime(parseISO(mergedJob.updatedAt)));
    }
  });

  it('should merge digest events when sequential calls', async () => {
    template = await session.createTemplate({
      steps: [
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

    await session.awaitRunningJobs(template?._id, false, 10);

    const jobs = await jobRepository.find({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: StepTypeEnum.DIGEST,
    });

    expect(jobs && jobs.length).to.eql(10);

    const delayedJobs = jobs.filter((elem) => elem.status === JobStatusEnum.DELAYED);
    expect(delayedJobs && delayedJobs.length).to.eql(1);
    const mergedJobs = jobs.filter((elem) => elem.status !== JobStatusEnum.DELAYED);
    expect(mergedJobs && mergedJobs.length).to.eql(9);

    const delayedJob = delayedJobs[0];
    const { updatedAt: delayedJobUpdateTime, payload } = delayedJob;
    expect(delayedJobUpdateTime).to.be.ok;
    expect(payload && payload.customVar).to.contain('sequential-calls-');
  });
});

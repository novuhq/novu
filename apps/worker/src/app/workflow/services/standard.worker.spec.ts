import { faker } from '@faker-js/faker';
import { Test } from '@nestjs/testing';
import {
  FeatureFlagsService,
  JobsOptions,
  PinoLogger,
  SqsService,
  StandardQueueService,
  WorkflowInMemoryProviderService,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  EnvironmentEntity,
  JobEntity,
  JobRepository,
  JobStatusEnum,
  MessageTemplateEntity,
  NotificationRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  OrganizationEntity,
  RUNNING_CLAIM_RENEW_INTERVAL_MS,
  RUNNING_CLAIM_STALE_AFTER_MS,
  SubscriberEntity,
  UserEntity,
} from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import {
  EnvironmentService,
  JobsService,
  NotificationTemplateService,
  OrganizationService,
  SubscribersService,
  UserService,
} from '@novu/testing';
import { expect } from 'chai';
import { formatISO } from 'date-fns';
import { setTimeout } from 'timers/promises';
import { v4 as uuid } from 'uuid';
import { SharedModule } from '../../shared/shared.module';
import { HandleLastFailedJob, RunJob, RunJobCommand, SetJobAsFailed, WebhookFilterBackoffStrategy } from '../usecases';
import { WorkflowModule } from '../workflow.module';
import { StandardWorker } from './standard.worker';

let standardQueueService: StandardQueueService;
let standardWorker: StandardWorker;

const mockFeatureFlagsService = {
  getFlag: async () => false,
} as unknown as FeatureFlagsService;

const mockOrganizationRepository = {
  findOne: async () => ({ _id: 'mock-org-id', apiServiceLevel: 'free' }),
} as unknown as CommunityOrganizationRepository;

const mockSqsService = {
  getQueueUrl: () => undefined,
  getProducer: () => undefined,
  getClient: () => ({}) as any,
  isConfigured: () => false,
  send: async () => {},
  sendBulk: async () => {},
} as unknown as SqsService;

const mockLogger = {
  setContext: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
} as unknown as PinoLogger;

describe('Standard Worker', () => {
  let jobRepository: JobRepository;
  let notificationRepository: NotificationRepository;
  let organization: OrganizationEntity;
  let environment: EnvironmentEntity;
  let user: UserEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let template: NotificationTemplateEntity;
  let jobsService: JobsService;
  let runJob: RunJob;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule],
    }).compile();
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    jobRepository = new JobRepository();
    notificationRepository = new NotificationRepository();
    jobsService = new JobsService();
    const userService = new UserService();

    const card = {
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
    };
    const userEntity: Partial<UserEntity> = {
      lastName: card.lastName,
      firstName: card.firstName,
      email: `${card.firstName}_${card.lastName}_${faker.datatype.uuid()}@gmail.com`.toLowerCase(),
      profilePicture: `https://randomuser.me/api/portraits/men/${Math.floor(Math.random() * 60) + 1}.jpg`,
      tokens: [],
      password: 'asd#Faf4fd',
      showOnBoarding: true,
    };

    user = await userService.createUser(userEntity);

    const organizationService = new OrganizationService();
    organization = await organizationService.createOrganization();
    await organizationService.addMember(organization._id, user._id);

    const environmentService = new EnvironmentService();
    environment = await environmentService.createEnvironment(organization._id, user._id);

    subscriberService = new SubscribersService(organization._id, environment._id);
    subscriber = await subscriberService.createSubscriber();

    const templateService = new NotificationTemplateService(user._id, organization._id, environment._id);
    template = await templateService.createTemplate({ noFeedId: true, noLayoutId: true, noGroupId: true });
    const workflowInMemoryProviderService = moduleRef.get<WorkflowInMemoryProviderService>(
      WorkflowInMemoryProviderService
    );

    standardQueueService = new StandardQueueService(
      workflowInMemoryProviderService,
      mockSqsService,
      mockFeatureFlagsService,
      mockOrganizationRepository,
      mockLogger
    );
    await standardQueueService.queue.obliterate();
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule, SharedModule],
    }).compile();

    const handleLastFailedJob = moduleRef.get<HandleLastFailedJob>(HandleLastFailedJob);
    runJob = moduleRef.get<RunJob>(RunJob);
    const setJobAsFailed = moduleRef.get<SetJobAsFailed>(SetJobAsFailed);
    const webhookFilterBackoffStrategy = moduleRef.get<WebhookFilterBackoffStrategy>(WebhookFilterBackoffStrategy);
    const workflowInMemoryProviderService = moduleRef.get<WorkflowInMemoryProviderService>(
      WorkflowInMemoryProviderService
    );
    const organizationRepository = moduleRef.get<CommunityOrganizationRepository>(CommunityOrganizationRepository);
    const featureFlagsService = moduleRef.get<FeatureFlagsService>(FeatureFlagsService);

    standardWorker = new StandardWorker(
      handleLastFailedJob,
      runJob,
      setJobAsFailed,
      webhookFilterBackoffStrategy,
      workflowInMemoryProviderService,
      organizationRepository,
      jobRepository,
      mockSqsService,
      mockLogger,
      featureFlagsService
    );
  });

  after(async () => {
    await standardQueueService.queue.drain();
    await standardWorker.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(standardWorker).to.be.ok;

    expect(standardWorker.DEFAULT_ATTEMPTS).to.eql(3);
    expect(standardWorker.bullMqWorker).to.deep.include({
      _eventsCount: 2,
      _maxListeners: undefined,
      name: 'standard',
    });
    expect(await standardWorker.bullMqService.getStatus()).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'standard',
      workerIsPaused: false,
      workerIsRunning: true,
    });
    expect(standardWorker.bullMqWorker.opts).to.deep.include({
      concurrency: 200,
      lockDuration: 90000,
    });
  });

  it('should a job added to the queue be updated as completed if works right', async () => {
    const existingJobs = await standardQueueService.queue.getJobs();
    expect(existingJobs.length).to.equal(0);

    const transactionId = uuid();
    const _environmentId = environment._id;
    const notification = await notificationRepository.create({
      _environmentId,
      _organizationId: organization._id,
      _subscriberId: subscriber._id,
      _templateId: template._id,
      _userId: user._id,
      tags: [],
    });
    const _notificationId = notification._id;
    const _organizationId = organization._id;
    const _subscriberId = subscriber._id;
    const _templateId = template._id;
    const _userId = user._id;

    // Job with fake notification template and fake notification.
    const job: Omit<JobEntity, '_id'> = {
      identifier: 'job-to-complete',
      payload: {},
      overrides: {},
      step: {
        template: {
          _environmentId,
          _organizationId,
          _creatorId: _userId,
          type: StepTypeEnum.TRIGGER,
          content: '',
        } as MessageTemplateEntity,
        _templateId,
      },
      transactionId,
      _notificationId,
      _environmentId,
      _organizationId,
      _userId,
      _subscriberId,
      subscriberId: subscriber.subscriberId,
      // claimAsRunning only accepts QUEUED|DELAYED (AddJob sets QUEUED before enqueue).
      status: JobStatusEnum.QUEUED,
      _templateId,
      digest: undefined,
      type: StepTypeEnum.TRIGGER,
      providerId: 'sendgrid',
      createdAt: formatISO(Date.now()),
      updatedAt: formatISO(Date.now()),
    };

    const jobCreated = await jobRepository.create(job);

    const jobData = {
      _environmentId: jobCreated._environmentId,
      _id: jobCreated._id,
      _organizationId: jobCreated._organizationId,
      _userId: jobCreated._userId,
    };

    await standardQueueService.add({ name: jobCreated._id, data: jobData, groupId: '0' });

    await jobsService.waitForJobCompletion({
      templateId: _templateId,
      organizationId: organization._id,
    });

    const jobs = await jobRepository.find({ _environmentId, _organizationId, _notificationId });
    expect(jobs.length).to.equal(1);

    expect(jobs[0].status).to.eql(JobStatusEnum.COMPLETED);
  });

  it('should a job added to the queue be updated as failed if it fails', async () => {
    const transactionId = uuid();
    const _environmentId = environment._id;
    const _notificationId = NotificationRepository.createObjectId();
    const _organizationId = organization._id;
    const _subscriberId = subscriber._id;
    const _templateId = NotificationTemplateRepository.createObjectId();
    const _userId = user._id;

    // Job with fake notification template and fake notification.
    const job: Omit<JobEntity, '_id'> = {
      identifier: 'job-to-fail',
      payload: {},
      overrides: {},
      step: {
        template: {
          _environmentId,
          _organizationId,
          _creatorId: _userId,
          type: StepTypeEnum.TRIGGER,
          content: '',
        } as MessageTemplateEntity,
        _templateId,
      },
      transactionId,
      _notificationId,
      _environmentId,
      _organizationId,
      _userId,
      _subscriberId,
      subscriberId: subscriber.subscriberId,
      // claimAsRunning only accepts QUEUED|DELAYED (AddJob sets QUEUED before enqueue).
      status: JobStatusEnum.QUEUED,
      _templateId,
      digest: undefined,
      type: StepTypeEnum.TRIGGER,
      providerId: 'sendgrid',
      createdAt: formatISO(Date.now()),
      updatedAt: formatISO(Date.now()),
    };

    const jobCreated = await jobRepository.create(job);

    const jobData = {
      _environmentId: jobCreated._environmentId,
      _id: jobCreated._id,
      _organizationId: jobCreated._organizationId,
      _userId: jobCreated._userId,
    };

    await standardQueueService.add({ name: jobCreated._id, data: jobData, groupId: '0' });

    await jobsService.waitForJobCompletion({
      templateId: _templateId,
      organizationId: organization._id,
    });

    /**
     * We pause a bit as little trick to allow the `failed` status to be updated
     * in the callback of the Worker and not having a race condition.
     */
    await setTimeout(100);

    let failedTrigger: JobEntity | null = null;
    do {
      failedTrigger = await jobRepository.findOne({
        _environmentId,
        _organizationId,
        _notificationId,
        status: JobStatusEnum.FAILED,
        type: StepTypeEnum.TRIGGER,
      });
    } while (!failedTrigger || !failedTrigger.error);

    expect(failedTrigger.error).to.deep.include({
      message: `Notification with id ${_notificationId} not found`,
    });
  });

  it('should pause the worker', async () => {
    const isPaused = await standardWorker.bullMqWorker.isPaused();
    expect(isPaused).to.equal(false);

    const runningStatus = await standardWorker.bullMqService.getStatus();
    expect(runningStatus).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'standard',
      workerIsPaused: false,
      workerIsRunning: true,
    });

    await standardWorker.pause();

    const isNowPaused = await standardWorker.bullMqWorker.isPaused();
    expect(isNowPaused).to.equal(true);

    const runningStatusChanged = await standardWorker.bullMqService.getStatus();
    expect(runningStatusChanged).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'standard',
      workerIsPaused: true,
      workerIsRunning: true,
    });
  });

  it('should resume the worker', async () => {
    await standardWorker.pause();

    const isPaused = await standardWorker.bullMqWorker.isPaused();
    expect(isPaused).to.equal(true);

    const runningStatus = await standardWorker.bullMqService.getStatus();
    expect(runningStatus).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'standard',
      workerIsPaused: true,
      workerIsRunning: true,
    });

    await standardWorker.resume();

    const isNowPaused = await standardWorker.bullMqWorker.isPaused();
    expect(isNowPaused).to.equal(false);

    const runningStatusChanged = await standardWorker.bullMqService.getStatus();
    expect(runningStatusChanged).to.deep.equal({
      queueIsPaused: undefined,
      queueName: undefined,
      workerName: 'standard',
      workerIsPaused: false,
      workerIsRunning: true,
    });
  });

  const buildJob = (status: JobStatusEnum, overrides: Partial<Omit<JobEntity, '_id'>> = {}): Omit<JobEntity, '_id'> => {
    const _environmentId = environment._id;
    const _organizationId = organization._id;
    const _userId = user._id;
    const _subscriberId = subscriber._id;
    const _templateId = NotificationTemplateRepository.createObjectId();
    const _notificationId = NotificationRepository.createObjectId();

    return {
      identifier: 'atomic-claim-test',
      payload: {},
      overrides: {},
      step: {
        template: {
          _environmentId,
          _organizationId,
          _creatorId: _userId,
          type: StepTypeEnum.TRIGGER,
          content: '',
        } as MessageTemplateEntity,
        _templateId,
      },
      transactionId: uuid(),
      _notificationId,
      _environmentId,
      _organizationId,
      _userId,
      _subscriberId,
      subscriberId: subscriber.subscriberId,
      status,
      _templateId,
      digest: undefined,
      type: StepTypeEnum.TRIGGER,
      providerId: 'sendgrid',
      createdAt: formatISO(Date.now()),
      updatedAt: formatISO(Date.now()),
      ...overrides,
    };
  };

  // Bypass schema timestamps so we can simulate a stale RUNNING claim.
  const backdateJobClaim = async (jobId: string, ageMs: number): Promise<void> => {
    await jobRepository._model.updateOne(
      { _id: jobId },
      { $set: { updatedAt: new Date(Date.now() - ageMs) } },
      { timestamps: false }
    );
  };

  describe('atomic job claim', () => {
    it('claimAsRunning transitions QUEUED -> RUNNING and returns the updated job', async () => {
      const created = await jobRepository.create(buildJob(JobStatusEnum.QUEUED));

      const claimed = await jobRepository.claimAsRunning(created._environmentId, created._id);

      expect(claimed).to.not.equal(null);
      expect(claimed?.status).to.equal(JobStatusEnum.RUNNING);

      const fresh = await jobRepository.findOne({ _id: created._id, _environmentId: created._environmentId });
      expect(fresh?.status).to.equal(JobStatusEnum.RUNNING);
    });

    it('claimAsRunning transitions DELAYED -> RUNNING (covers digest/delay/throttle redelivery)', async () => {
      const created = await jobRepository.create(buildJob(JobStatusEnum.DELAYED));

      const claimed = await jobRepository.claimAsRunning(created._environmentId, created._id);

      expect(claimed?.status).to.equal(JobStatusEnum.RUNNING);
    });

    it('claimAsRunning returns null for terminal statuses and for a freshly claimed RUNNING job', async () => {
      const completed = await jobRepository.create(buildJob(JobStatusEnum.COMPLETED));
      const canceled = await jobRepository.create(buildJob(JobStatusEnum.CANCELED));
      const freshlyRunning = await jobRepository.create(buildJob(JobStatusEnum.RUNNING));

      expect(await jobRepository.claimAsRunning(completed._environmentId, completed._id)).to.equal(null);
      expect(await jobRepository.claimAsRunning(canceled._environmentId, canceled._id)).to.equal(null);
      expect(await jobRepository.claimAsRunning(freshlyRunning._environmentId, freshlyRunning._id)).to.equal(null);
    });

    it('claimAsRunning reclaims a RUNNING job whose claim lease went stale (crashed worker redelivery)', async () => {
      const stuck = await jobRepository.create(buildJob(JobStatusEnum.RUNNING));
      await backdateJobClaim(stuck._id, RUNNING_CLAIM_STALE_AFTER_MS + 1_000);

      const reclaimed = await jobRepository.claimAsRunning(stuck._environmentId, stuck._id);

      expect(reclaimed).to.not.equal(null);
      expect(reclaimed?.status).to.equal(JobStatusEnum.RUNNING);
      expect(await jobRepository.claimAsRunning(stuck._environmentId, stuck._id)).to.equal(null);
    });

    it('releaseRunningClaim makes a RUNNING job claimable again (webhook-filter backoff retry)', async () => {
      const created = await jobRepository.create(buildJob(JobStatusEnum.QUEUED));

      const firstAttempt = await jobRepository.claimAsRunning(created._environmentId, created._id);
      expect(firstAttempt?.status).to.equal(JobStatusEnum.RUNNING);

      await jobRepository.releaseRunningClaim(created._environmentId, created._id);

      const retryAttempt = await jobRepository.claimAsRunning(created._environmentId, created._id);
      expect(retryAttempt?.status).to.equal(JobStatusEnum.RUNNING);
    });

    it('releaseRunningClaim does not touch a job that already left RUNNING', async () => {
      const failed = await jobRepository.create(buildJob(JobStatusEnum.FAILED));

      await jobRepository.releaseRunningClaim(failed._environmentId, failed._id);

      const fresh = await jobRepository.findOne({ _id: failed._id, _environmentId: failed._environmentId });
      expect(fresh?.status).to.equal(JobStatusEnum.FAILED);
    });

    it('renewRunningClaim keeps a slow-but-healthy execution fenced against redelivery', async () => {
      const running = await jobRepository.create(buildJob(JobStatusEnum.RUNNING));
      await backdateJobClaim(running._id, RUNNING_CLAIM_STALE_AFTER_MS + 1_000);

      // Heartbeat from the live worker renews the lease...
      await jobRepository.renewRunningClaim(running._environmentId, running._id);

      // ...so a redelivered message can no longer treat the claim as stale.
      expect(await jobRepository.claimAsRunning(running._environmentId, running._id)).to.equal(null);
    });

    it('does not leak the claim heartbeat when execute throws before the main try block', async () => {
      const created = await jobRepository.create(buildJob(JobStatusEnum.QUEUED));

      // Track heartbeat intervals (identified by their renew period) and whether they get cleared.
      const heartbeats: NodeJS.Timeout[] = [];
      const cleared = new Set<NodeJS.Timeout>();
      const originalSetInterval = globalThis.setInterval;
      const originalClearInterval = globalThis.clearInterval;
      globalThis.setInterval = ((...intervalArgs: Parameters<typeof originalSetInterval>) => {
        const timer = originalSetInterval(...intervalArgs);
        if (intervalArgs[1] === RUNNING_CLAIM_RENEW_INTERVAL_MS) {
          heartbeats.push(timer);
        }

        return timer;
      }) as typeof originalSetInterval;
      globalThis.clearInterval = ((timer: Parameters<typeof originalClearInterval>[0]) => {
        cleared.add(timer as NodeJS.Timeout);

        return originalClearInterval(timer);
      }) as typeof originalClearInterval;

      // Force the first post-claim operation of RunJob.execute to fail.
      const stepRunRepository = Reflect.get(runJob, 'stepRunRepository') as {
        create: (...createArgs: unknown[]) => Promise<unknown>;
      };
      const originalCreate = stepRunRepository.create;
      stepRunRepository.create = async () => {
        throw new Error('step run persistence failure');
      };

      try {
        let thrown: Error | undefined;
        try {
          await runJob.execute(
            RunJobCommand.create({
              jobId: created._id,
              environmentId: created._environmentId,
              organizationId: created._organizationId,
              userId: created._userId,
            })
          );
        } catch (executeError) {
          thrown = executeError as Error;
        }
        expect(thrown?.message).to.equal('step run persistence failure');

        const leaked = heartbeats.filter((timer) => !cleared.has(timer));
        expect(leaked.length).to.equal(0);
      } finally {
        for (const timer of heartbeats) {
          originalClearInterval(timer);
        }
        stepRunRepository.create = originalCreate;
        globalThis.setInterval = originalSetInterval;
        globalThis.clearInterval = originalClearInterval;
      }
    });

    it('renewRunningClaim is a no-op once the job has left RUNNING', async () => {
      const completed = await jobRepository.create(buildJob(JobStatusEnum.COMPLETED));
      await backdateJobClaim(completed._id, RUNNING_CLAIM_STALE_AFTER_MS + 1_000);
      const before = await jobRepository.findOne({ _id: completed._id, _environmentId: completed._environmentId });

      await jobRepository.renewRunningClaim(completed._environmentId, completed._id);

      const after = await jobRepository.findOne({ _id: completed._id, _environmentId: completed._environmentId });
      expect(after?.status).to.equal(JobStatusEnum.COMPLETED);
      expect(before?.updatedAt).to.be.a('string');
      expect(after?.updatedAt).to.equal(before?.updatedAt);
    });

    it('claimAsRunning is exclusive under concurrent callers (only one wins)', async () => {
      const created = await jobRepository.create(buildJob(JobStatusEnum.QUEUED));

      const concurrency = 8;
      const results = await Promise.all(
        Array.from({ length: concurrency }, () => jobRepository.claimAsRunning(created._environmentId, created._id))
      );

      const winners = results.filter((res) => res !== null);
      expect(winners.length).to.equal(1);
      expect(winners[0]?.status).to.equal(JobStatusEnum.RUNNING);
    });

    it('claimNextChildAsQueued transitions a child PENDING -> QUEUED exactly once', async () => {
      const parent = await jobRepository.create(buildJob(JobStatusEnum.COMPLETED));
      const child = await jobRepository.create({
        ...buildJob(JobStatusEnum.PENDING, { _notificationId: parent._notificationId }),
        _parentId: parent._id,
      });

      const concurrency = 6;
      const results = await Promise.all(
        Array.from({ length: concurrency }, () =>
          jobRepository.claimNextChildAsQueued(parent._environmentId, parent._id)
        )
      );

      const winners = results.filter((res) => res !== null);
      expect(winners.length).to.equal(1);
      expect(winners[0]?._id).to.equal(child._id);
      expect(winners[0]?.status).to.equal(JobStatusEnum.QUEUED);
      // The claim opens the claim-to-enqueue crash window; AddJob closes it via markEnqueued.
      expect(winners[0]?.awaitingEnqueue).to.equal(true);

      const fresh = await jobRepository.findOne({ _id: child._id, _environmentId: child._environmentId });
      expect(fresh?.status).to.equal(JobStatusEnum.QUEUED);
    });

    it('claimNextChildAsQueued returns null when no PENDING child exists', async () => {
      const parent = await jobRepository.create(buildJob(JobStatusEnum.COMPLETED));

      const result = await jobRepository.claimNextChildAsQueued(parent._environmentId, parent._id);

      expect(result).to.equal(null);
    });

    it('releaseStaleQueuedChildToPending leaves a freshly claimed QUEUED child alone (AddJob still in flight)', async () => {
      const parent = await jobRepository.create(buildJob(JobStatusEnum.COMPLETED));
      await jobRepository.create({
        ...buildJob(JobStatusEnum.QUEUED, { _notificationId: parent._notificationId }),
        _parentId: parent._id,
      });

      const result = await jobRepository.releaseStaleQueuedChildToPending(parent._environmentId, parent._id);

      expect(result).to.equal(null);
    });

    it('releaseStaleQueuedChildToPending releases a stale QUEUED child exactly once under concurrent redeliveries', async () => {
      const parent = await jobRepository.create(buildJob(JobStatusEnum.COMPLETED));
      const child = await jobRepository.create({
        ...buildJob(JobStatusEnum.QUEUED, { _notificationId: parent._notificationId }),
        _parentId: parent._id,
      });
      await backdateJobClaim(child._id, RUNNING_CLAIM_STALE_AFTER_MS + 1_000);

      const concurrency = 6;
      const results = await Promise.all(
        Array.from({ length: concurrency }, () =>
          jobRepository.releaseStaleQueuedChildToPending(parent._environmentId, parent._id)
        )
      );

      // The winning release flips the child to PENDING, so the losers no longer match QUEUED.
      const winners = results.filter((res) => res !== null);
      expect(winners.length).to.equal(1);
      expect(winners[0]?._id).to.equal(child._id);
      expect(winners[0]?.status).to.equal(JobStatusEnum.PENDING);

      const fresh = await jobRepository.findOne({ _id: child._id, _environmentId: child._environmentId });
      expect(fresh?.status).to.equal(JobStatusEnum.PENDING);
    });

    it('releaseStaleQueuedChildToPending never releases a child whose message was already enqueued', async () => {
      const parent = await jobRepository.create(buildJob(JobStatusEnum.COMPLETED));
      await jobRepository.create({
        ...buildJob(JobStatusEnum.PENDING, { _notificationId: parent._notificationId }),
        _parentId: parent._id,
      });

      const claimed = await jobRepository.claimNextChildAsQueued(parent._environmentId, parent._id);
      if (!claimed) throw new Error('expected the child to be claimed');
      expect(claimed.awaitingEnqueue).to.equal(true);

      // AddJob confirms the queue message exists, then the message sits behind a long backlog.
      await jobRepository.markEnqueued(claimed._environmentId, claimed._id);
      await backdateJobClaim(claimed._id, RUNNING_CLAIM_STALE_AFTER_MS + 1_000);

      const released = await jobRepository.releaseStaleQueuedChildToPending(parent._environmentId, parent._id);

      expect(released).to.equal(null);
      const fresh = await jobRepository.findOne({ _id: claimed._id, _environmentId: claimed._environmentId });
      expect(fresh?.status).to.equal(JobStatusEnum.QUEUED);
    });

    it('releaseStaleQueuedChildToPending ignores children that already progressed past QUEUED', async () => {
      const parent = await jobRepository.create(buildJob(JobStatusEnum.COMPLETED));
      const child = await jobRepository.create({
        ...buildJob(JobStatusEnum.RUNNING, { _notificationId: parent._notificationId }),
        _parentId: parent._id,
      });
      await backdateJobClaim(child._id, RUNNING_CLAIM_STALE_AFTER_MS + 1_000);

      const result = await jobRepository.releaseStaleQueuedChildToPending(parent._environmentId, parent._id);

      expect(result).to.equal(null);
    });
  });

  describe('queue entry dedup', () => {
    // A long delay parks the entry in the delayed set, where the running worker cannot consume it.
    const DELAY_MS = 60_000;

    const enqueue = async (job: JobEntity, options: JobsOptions = {}) =>
      standardQueueService.add({
        name: job._id,
        data: {
          _environmentId: job._environmentId,
          _id: job._id,
          _organizationId: job._organizationId,
          _userId: job._userId,
        },
        groupId: '0',
        options: { delay: DELAY_MS, ...options },
      });

    /*
     * Nothing else in this suite enqueues with a delay and afterEach empties the set, so every
     * delayed entry belongs to the test at hand - including one BullMQ numbered itself because a
     * caller-supplied id went missing.
     */
    const delayedEntryIds = async (): Promise<(string | undefined)[]> => {
      const delayed = await standardQueueService.queue.getDelayed();

      return delayed.map((entry) => entry.id);
    };

    afterEach(async () => {
      const delayed = await standardQueueService.queue.getDelayed();
      await Promise.all(delayed.map((entry) => entry.remove()));
    });

    it('collapses a repeated enqueue of the same job onto the live entry', async () => {
      const created = await jobRepository.create(buildJob(JobStatusEnum.QUEUED));

      await enqueue(created);
      await enqueue(created);

      expect(await delayedEntryIds()).to.deep.equal([created._id]);
    });

    it('still dedups when a caller passes an explicitly undefined job id', async () => {
      const created = await jobRepository.create(buildJob(JobStatusEnum.QUEUED));

      await enqueue(created);
      await enqueue(created, { jobId: undefined });

      expect(await delayedEntryIds()).to.deep.equal([created._id]);
    });

    it('keeps a schedule extension re-queue alongside the entry it extends', async () => {
      const created = await jobRepository.create(buildJob(JobStatusEnum.QUEUED));

      // Mirrors the ids AddJob.queueJob derives before and after an extension.
      await enqueue(created, { jobId: created._id });
      await enqueue(created, { jobId: `${created._id}-ext1` });

      const ids = await delayedEntryIds();
      expect(ids.length).to.equal(2);
      expect(ids).to.include(created._id);
      expect(ids).to.include(`${created._id}-ext1`);
    });
  });

  describe('redelivery recovery', () => {
    const createNotification = async () =>
      notificationRepository.create({
        _environmentId: environment._id,
        _organizationId: organization._id,
        _subscriberId: subscriber._id,
        _templateId: template._id,
        _userId: user._id,
        tags: [],
      });

    it('a redelivered message re-runs and completes a job stuck RUNNING by a crashed worker', async () => {
      const notification = await createNotification();
      const stuck = await jobRepository.create(
        buildJob(JobStatusEnum.RUNNING, { _notificationId: notification._id, _templateId: template._id })
      );
      await backdateJobClaim(stuck._id, RUNNING_CLAIM_STALE_AFTER_MS + 1_000);

      await standardQueueService.add({
        name: stuck._id,
        data: {
          _environmentId: stuck._environmentId,
          _id: stuck._id,
          _organizationId: stuck._organizationId,
          _userId: stuck._userId,
        },
        groupId: '0',
      });

      await jobsService.waitForJobCompletion({
        templateId: template._id,
        organizationId: organization._id,
      });

      const recovered = await jobRepository.findOne({ _id: stuck._id, _environmentId: stuck._environmentId });
      expect(recovered?.status).to.equal(JobStatusEnum.COMPLETED);
    });

    it('a redelivered completed job resumes a workflow chain stranded before the child was queued', async () => {
      const notification = await createNotification();
      const parent = await jobRepository.create(
        buildJob(JobStatusEnum.COMPLETED, { _notificationId: notification._id, _templateId: template._id })
      );
      const child = await jobRepository.create({
        ...buildJob(JobStatusEnum.PENDING, {
          _notificationId: notification._id,
          _templateId: template._id,
          transactionId: parent.transactionId,
        }),
        _parentId: parent._id,
      });

      await standardQueueService.add({
        name: parent._id,
        data: {
          _environmentId: parent._environmentId,
          _id: parent._id,
          _organizationId: parent._organizationId,
          _userId: parent._userId,
        },
        groupId: '0',
      });

      await jobsService.waitForJobCompletion({
        templateId: template._id,
        organizationId: organization._id,
      });

      const resumedChild = await jobRepository.findOne({ _id: child._id, _environmentId: child._environmentId });
      expect(resumedChild?.status).to.equal(JobStatusEnum.COMPLETED);

      const parentAfter = await jobRepository.findOne({ _id: parent._id, _environmentId: parent._environmentId });
      expect(parentAfter?.status).to.equal(JobStatusEnum.COMPLETED);
    });

    it('a redelivered completed job resumes a chain whose child was claimed QUEUED but never enqueued', async () => {
      // Production scenario: worker died between claimNextChildAsQueued and
      // AddJob's enqueue — the child sits QUEUED with no queue message.
      const notification = await createNotification();
      const parent = await jobRepository.create(
        buildJob(JobStatusEnum.COMPLETED, { _notificationId: notification._id, _templateId: template._id })
      );
      const child = await jobRepository.create({
        ...buildJob(JobStatusEnum.QUEUED, {
          _notificationId: notification._id,
          _templateId: template._id,
          transactionId: parent.transactionId,
        }),
        _parentId: parent._id,
      });
      await backdateJobClaim(child._id, RUNNING_CLAIM_STALE_AFTER_MS + 1_000);

      await standardQueueService.add({
        name: parent._id,
        data: {
          _environmentId: parent._environmentId,
          _id: parent._id,
          _organizationId: parent._organizationId,
          _userId: parent._userId,
        },
        groupId: '0',
      });

      await jobsService.waitForJobCompletion({
        templateId: template._id,
        organizationId: organization._id,
      });

      const resumedChild = await jobRepository.findOne({ _id: child._id, _environmentId: child._environmentId });
      expect(resumedChild?.status).to.equal(JobStatusEnum.COMPLETED);

      const parentAfter = await jobRepository.findOne({ _id: parent._id, _environmentId: parent._environmentId });
      expect(parentAfter?.status).to.equal(JobStatusEnum.COMPLETED);
    });
  });
});

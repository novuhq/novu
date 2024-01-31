import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { formatISO } from 'date-fns';
import { v4 as uuid } from 'uuid';
import { faker } from '@faker-js/faker';
import { setTimeout } from 'timers/promises';

import {
  EnvironmentEntity,
  JobEntity,
  JobRepository,
  JobStatusEnum,
  MessageTemplateEntity,
  NotificationRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  OrganizationEntity,
  SubscriberEntity,
  UserEntity,
} from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import {
  EnvironmentService,
  NotificationTemplateService,
  OrganizationService,
  SubscribersService,
  UserService,
  JobsService,
} from '@novu/testing';
import { BullMqService, StandardQueueService, WorkflowInMemoryProviderService } from '@novu/application-generic';

import { StandardWorker } from './standard.worker';

import { WorkflowModule } from '../workflow.module';
import {
  HandleLastFailedJob,
  RunJob,
  SetJobAsCompleted,
  SetJobAsFailed,
  WebhookFilterBackoffStrategy,
} from '../usecases';
import { SharedModule } from '../../shared/shared.module';

let standardQueueService: StandardQueueService;
let standardWorker: StandardWorker;

describe('Standard Worker', () => {
  let jobRepository: JobRepository;
  let organization: OrganizationEntity;
  let environment: EnvironmentEntity;
  let user: UserEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let template: NotificationTemplateEntity;
  let jobsService: JobsService;

  before(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule],
    }).compile();
    process.env.IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';
    process.env.IS_IN_MEMORY_CLUSTER_MODE_ENABLED = 'false';

    jobRepository = new JobRepository();

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
      password: '123Qwe!@#',
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

    standardQueueService = new StandardQueueService(workflowInMemoryProviderService);
    await standardQueueService.queue.obliterate();
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule, SharedModule],
    }).compile();

    const handleLastFailedJob = moduleRef.get<HandleLastFailedJob>(HandleLastFailedJob);
    const runJob = moduleRef.get<RunJob>(RunJob);
    const setJobAsCompleted = moduleRef.get<SetJobAsCompleted>(SetJobAsCompleted);
    const setJobAsFailed = moduleRef.get<SetJobAsFailed>(SetJobAsFailed);
    const webhookFilterBackoffStrategy = moduleRef.get<WebhookFilterBackoffStrategy>(WebhookFilterBackoffStrategy);
    const workflowInMemoryProviderService = moduleRef.get<WorkflowInMemoryProviderService>(
      WorkflowInMemoryProviderService
    );

    standardWorker = new StandardWorker(
      handleLastFailedJob,
      runJob,
      setJobAsCompleted,
      setJobAsFailed,
      webhookFilterBackoffStrategy,
      workflowInMemoryProviderService
    );
  });

  after(async () => {
    await standardQueueService.queue.drain();
    await standardWorker.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(standardWorker).to.be.ok;

    expect(standardWorker.DEFAULT_ATTEMPTS).to.eql(3);
    expect(standardWorker.worker).to.deep.include({
      _eventsCount: 1,
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
    expect(standardWorker.worker.opts).to.deep.include({
      concurrency: 200,
      lockDuration: 90000,
    });
  });

  it('should a job added to the queue be updated as completed if works right', async () => {
    const existingJobs = await standardQueueService.queue.getJobs();
    expect(existingJobs.length).to.equal(0);

    const transactionId = uuid();
    const _environmentId = environment._id;
    const _notificationId = NotificationRepository.createObjectId();
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
      status: JobStatusEnum.PENDING,
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

    await jobsService.awaitRunningJobs({
      templateId: _templateId,
      organizationId: organization._id,
      delay: false,
    });

    const jobs = await jobRepository.find({ _environmentId, _organizationId });
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
      status: JobStatusEnum.PENDING,
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

    await jobsService.awaitRunningJobs({
      templateId: _templateId,
      organizationId: organization._id,
      delay: false,
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
        status: JobStatusEnum.FAILED,
        type: StepTypeEnum.TRIGGER,
      });
    } while (!failedTrigger || !failedTrigger.error);

    expect(failedTrigger.error).to.deep.include({
      message: `Notification template ${_templateId} is not found`,
    });
  });

  it('should pause the worker', async () => {
    const isPaused = await standardWorker.worker.isPaused();
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

    const isNowPaused = await standardWorker.worker.isPaused();
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

    const isPaused = await standardWorker.worker.isPaused();
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

    const isNowPaused = await standardWorker.worker.isPaused();
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
});

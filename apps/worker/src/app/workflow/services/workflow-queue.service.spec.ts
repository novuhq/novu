import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { formatISO } from 'date-fns';
import { v4 as uuid } from 'uuid';
import { faker } from '@faker-js/faker';

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
import { QueueService } from '@novu/application-generic';

import { WorkflowModule } from '../workflow.module';

let queueService: QueueService;

describe('Workflow Queue service', () => {
  let jobRepository: JobRepository;
  let organization: OrganizationEntity;
  let environment: EnvironmentEntity;
  let user: UserEntity;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let template: NotificationTemplateEntity;
  let jobsService: JobsService;

  before(async () => {
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
    environment = await environmentService.createEnvironment(organization._id);

    subscriberService = new SubscribersService(organization._id, environment._id);
    subscriber = await subscriberService.createSubscriber();

    const templateService = new NotificationTemplateService(user._id, organization._id, environment._id);
    template = await templateService.createTemplate({ noFeedId: true, noLayoutId: true, noGroupId: true });
  });

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [WorkflowModule],
    }).compile();

    queueService = moduleRef.get<QueueService>(QueueService);
  });

  afterEach(async () => {
    await queueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(queueService).to.be.ok;
    expect(queueService).to.have.all.keys(
      'DEFAULT_ATTEMPTS',
      'bullConfig',
      'bullMqService',
      'createExecutionDetails',
      'getBackoffStrategies',
      'name',
      'queueNextJob',
      'runJob',
      'setJobAsCompleted',
      'setJobAsFailed',
      'webhookFilterWebhookFilterBackoffStrategy'
    );
    expect(queueService.DEFAULT_ATTEMPTS).to.eql(3);
    expect(queueService.bullMqService.queue).to.deep.include({
      _events: {},
      _eventsCount: 0,
      _maxListeners: undefined,
      name: 'standard',
      jobsOpts: {
        removeOnComplete: true,
      },
    });
  });

  it('should a job added to the queue be updated as completed if works right', async () => {
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

    await queueService.addToQueue(jobCreated._id, jobCreated, '0');

    await jobsService.awaitRunningJobs({
      templateId: _templateId,
      organizationId: organization._id,
      delay: false,
    });

    const jobs = await jobRepository.find({ _environmentId, _organizationId });
    expect(jobs.length).to.eql(1);

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

    await queueService.addToQueue(jobCreated._id, jobCreated, '0');

    await jobsService.awaitRunningJobs({
      templateId: _templateId,
      organizationId: organization._id,
      delay: false,
    });
    // We pause the worker as little trick to allow the `failed` status to be updated in the callback of the worker and not having a race condition.
    await queueService.gracefulShutdown();

    let failedTrigger: JobEntity | null = null;
    do {
      failedTrigger = await jobRepository.findOne({
        _environmentId,
        _organizationId,
        status: JobStatusEnum.FAILED,
        type: StepTypeEnum.TRIGGER,
      });
    } while (!failedTrigger || !failedTrigger.error);

    expect(failedTrigger!.error).to.deep.include({
      message: `Notification template ${_templateId} is not found`,
    });
  });
});

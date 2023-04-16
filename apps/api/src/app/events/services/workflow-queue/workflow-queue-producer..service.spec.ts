import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { formatISO } from 'date-fns';
import { v4 as uuid } from 'uuid';
import {
  JobEntity,
  JobRepository,
  JobStatusEnum,
  MessageTemplateEntity,
  NotificationRepository,
  NotificationTemplateEntity,
  NotificationTemplateRepository,
  SubscriberEntity,
} from '@novu/dal';
import { StepTypeEnum } from '@novu/shared';
import { SubscribersService, UserSession } from '@novu/testing';
import { QueueService } from '@novu/application-generic';

import { EventsModule } from '../../events.module';
import { ExecutionDetailsModule } from '../../../execution-details/execution-details.module';

let queueService: QueueService;

describe('Workflow Queue service', () => {
  let jobRepository: JobRepository;
  let session: UserSession;
  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  let template: NotificationTemplateEntity;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [EventsModule, ExecutionDetailsModule],
    }).compile();

    queueService = moduleRef.get<QueueService>(QueueService);

    jobRepository = new JobRepository();
    session = new UserSession();
    await session.initialize();

    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();

    template = await session.createTemplate();
  });

  afterEach(async () => {
    await queueService.gracefulShutdown();
  });

  it('should be initialised properly', async () => {
    expect(queueService).to.be.ok;
    expect(queueService).to.have.all.keys('DEFAULT_ATTEMPTS', 'bullConfig', 'bullMqService', 'name');
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
    const _environmentId = session.environment._id;
    const _notificationId = NotificationRepository.createObjectId();
    const _organizationId = session.organization._id;
    const _subscriberId = subscriber._id;
    const _templateId = template._id;
    const _userId = session.user._id;

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

    await session.awaitRunningJobs(_templateId, false, 0);

    const jobs = await jobRepository.find({ _environmentId, _organizationId });
    expect(jobs.length).to.eql(1);

    expect(jobs[0].status).to.eql(JobStatusEnum.COMPLETED);
  });

  it('should a job added to the queue be updated as failed if it fails', async () => {
    const transactionId = uuid();
    const _environmentId = session.environment._id;
    const _notificationId = NotificationRepository.createObjectId();
    const _organizationId = session.organization._id;
    const _subscriberId = subscriber._id;
    const _templateId = NotificationTemplateRepository.createObjectId();
    const _userId = session.user._id;

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

    await session.awaitRunningJobs(_templateId, false, 0);
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

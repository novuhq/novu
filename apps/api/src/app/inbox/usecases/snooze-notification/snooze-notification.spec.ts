import { HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  CreateExecutionDetails,
  CreateExecutionDetailsCommand,
  PinoLogger,
  StandardQueueService,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  JobEntity,
  JobRepository,
  MessageEntity,
  MessageRepository,
  OrganizationEntity,
} from '@novu/dal';
import { ApiServiceLevelEnum, ChannelTypeEnum, JobStatusEnum, SeverityLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { InboxNotification } from '../../utils/types';
import { MarkNotificationAsCommand } from '../mark-notification-as/mark-notification-as.command';
import { MarkNotificationAs } from '../mark-notification-as/mark-notification-as.usecase';
import { SnoozeNotificationCommand } from './snooze-notification.command';
import { SnoozeNotification } from './snooze-notification.usecase';

describe('SnoozeNotification', () => {
  const validNotificationId = '507f1f77bcf86cd799439011';
  const validEnvId = '507f1f77bcf86cd799439012';
  const validOrgId = '507f1f77bcf86cd799439013';
  const validJobId = '507f1f77bcf86cd799439014';
  const validSubscriberId = '507f1f77bcf86cd799439015';

  // Snooze durations in days
  const SNOOZE_DURATION = {
    ONE_HOUR: 1 / 24,
    ONE_DAY: 1,
    THIRTY_DAYS: 30, // Exceeds free tier limit
    NINETY_DAYS: 90, // Paid tier max
    HUNDRED_DAYS: 100, // Exceeds paid tier limit
  };

  let snoozeNotification: SnoozeNotification;
  let loggerMock: sinon.SinonStubbedInstance<PinoLogger>;
  let messageRepositoryMock: sinon.SinonStubbedInstance<MessageRepository>;
  let jobRepositoryMock: sinon.SinonStubbedInstance<JobRepository>;
  let standardQueueServiceMock: sinon.SinonStubbedInstance<StandardQueueService>;
  let organizationRepositoryMock: sinon.SinonStubbedInstance<CommunityOrganizationRepository>;
  let createExecutionDetailsMock: sinon.SinonStubbedInstance<CreateExecutionDetails>;
  let markNotificationAsMock: sinon.SinonStubbedInstance<MarkNotificationAs>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;

  const mockMessage: MessageEntity = {
    _id: validNotificationId,
    _jobId: validJobId,
    _environmentId: validEnvId,
    channel: ChannelTypeEnum.IN_APP,
    _subscriberId: validSubscriberId,
  } as MessageEntity;

  const mockJob: JobEntity = {
    _id: validJobId,
    _environmentId: validEnvId,
    _organizationId: validOrgId,
    _userId: validSubscriberId,
    payload: {
      subscriberId: validSubscriberId,
    },
    transactionId: 'transaction-id',
    status: JobStatusEnum.PENDING,
  } as JobEntity;

  const mockNotification: InboxNotification = {
    id: validNotificationId,
    transactionId: 'transaction-id',
    body: 'Test notification',
    to: {
      subscriberId: validSubscriberId,
      id: validSubscriberId,
    },
    isSeen: false,
    isRead: false,
    isArchived: false,
    isSnoozed: true,
    snoozedUntil: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    channelType: ChannelTypeEnum.IN_APP,
    severity: SeverityLevelEnum.NONE,
  };

  beforeEach(() => {
    loggerMock = sinon.createStubInstance(PinoLogger);
    messageRepositoryMock = sinon.createStubInstance(MessageRepository);
    jobRepositoryMock = sinon.createStubInstance(JobRepository);
    standardQueueServiceMock = sinon.createStubInstance(StandardQueueService);
    organizationRepositoryMock = sinon.createStubInstance(CommunityOrganizationRepository);
    createExecutionDetailsMock = sinon.createStubInstance(CreateExecutionDetails);
    markNotificationAsMock = sinon.createStubInstance(MarkNotificationAs);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);

    // Mock the MarkNotificationAsCommand.create method
    sinon.stub(MarkNotificationAsCommand, 'create').returns({
      environmentId: validEnvId,
      organizationId: validOrgId,
      subscriberId: validSubscriberId,
      notificationId: validNotificationId,
      snoozedUntil: new Date(),
    } as MarkNotificationAsCommand);

    sinon.stub(CreateExecutionDetailsCommand, 'create').returns({} as any);
    sinon.stub(CreateExecutionDetailsCommand, 'getDetailsFromJob').returns({} as any);

    // @ts-expect-error Mocking the withTransaction method
    messageRepositoryMock.withTransaction = sinon.stub().callsFake((callback) => callback());

    snoozeNotification = new SnoozeNotification(
      loggerMock as any,
      messageRepositoryMock as any,
      jobRepositoryMock as any,
      standardQueueServiceMock as any,
      organizationRepositoryMock as any,
      createExecutionDetailsMock as any,
      markNotificationAsMock as any,
      analyticsServiceMock as any
    );

    sinon.stub(JobRepository, 'createObjectId').returns('new-job-id');

    jobRepositoryMock.create.resolves(mockJob);
    jobRepositoryMock.findOne.resolves(mockJob);
    markNotificationAsMock.execute.resolves(mockNotification);
    createExecutionDetailsMock.execute.resolves();

    const orgEntity = {
      _id: validOrgId,
      name: 'Test Org',
      apiServiceLevel: ApiServiceLevelEnum.BUSINESS,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    } as OrganizationEntity;

    organizationRepositoryMock.findOne.resolves(orgEntity);
    standardQueueServiceMock.add.resolves();
    messageRepositoryMock.findOne.resolves(mockMessage);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw NotFoundException when notification is not found', async () => {
    const command = createCommand(SNOOZE_DURATION.ONE_HOUR);
    messageRepositoryMock.findOne.resolves(null);

    try {
      await snoozeNotification.execute(command);
      expect.fail('Should have thrown NotFoundException');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
    }
  });

  it('should throw HttpException when snooze duration exceeds free tier limit (24 hours)', async () => {
    // Testing with 30 days (exceeds free tier 24-hour limit)
    const command = createCommand(SNOOZE_DURATION.THIRTY_DAYS);

    // Set organization to free tier
    const freeOrgEntity = {
      _id: validOrgId,
      name: 'Test Org',
      apiServiceLevel: ApiServiceLevelEnum.FREE,
      createdAt: '2023-01-01T00:00:00.000Z',
      updatedAt: '2023-01-01T00:00:00.000Z',
    } as OrganizationEntity;

    organizationRepositoryMock.findOne.resolves(freeOrgEntity);

    try {
      await snoozeNotification.execute(command);
      expect.fail('Should have thrown HttpException');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect(err.getStatus()).to.equal(HttpStatus.PAYMENT_REQUIRED);
    }
  });

  it('should throw HttpException when snooze duration exceeds paid tier limit (90 days)', async () => {
    // Create a command with duration exceeding 90 days (paid tier max)
    const command = createCommand(SNOOZE_DURATION.HUNDRED_DAYS);

    try {
      await snoozeNotification.execute(command);
      expect.fail('Should have thrown HttpException');
    } catch (err) {
      expect(err).to.be.instanceOf(HttpException);
      expect(err.getStatus()).to.equal(HttpStatus.PAYMENT_REQUIRED);
    }
  });

  it('should successfully snooze a notification', async () => {
    const command = createCommand(SNOOZE_DURATION.ONE_HOUR);

    const result = await snoozeNotification.execute(command);

    expect(result).to.deep.equal(mockNotification);
    expect(jobRepositoryMock.create.calledOnce).to.be.true;
    const createCallArg = jobRepositoryMock.create.firstCall.args[0];
    expect(createCallArg).to.have.property('status', JobStatusEnum.PENDING);
    expect(createCallArg).to.have.property('delay').that.is.a('number');
    expect(createCallArg.payload).to.have.property('unsnooze', true);

    expect(markNotificationAsMock.execute.calledOnce).to.be.true;
    expect(standardQueueServiceMock.add.calledOnce).to.be.true;
    expect(createExecutionDetailsMock.execute.called).to.be.true;
  });

  it('should enqueue job with correct parameters', async () => {
    const delay = 3600000; // 1 hour in milliseconds

    await snoozeNotification.enqueueJob(mockJob, delay);

    expect(standardQueueServiceMock.add.calledOnce).to.be.true;
    const addCallArg = standardQueueServiceMock.add.firstCall.args[0];

    expect(addCallArg.data).to.deep.equal({
      _environmentId: mockJob._environmentId,
      _id: mockJob._id,
      _organizationId: mockJob._organizationId,
      _userId: mockJob._userId,
    });

    if (addCallArg.options) {
      expect(addCallArg.options).to.have.property('delay', delay);
      expect(addCallArg.options).to.have.property('attempts', 3);
      expect(addCallArg.options.backoff).to.have.property('type', 'exponential');
    }
  });

  function createCommand(days: number): SnoozeNotificationCommand {
    const snoozeUntil = new Date();
    snoozeUntil.setDate(snoozeUntil.getDate() + days);

    return {
      environmentId: validEnvId,
      organizationId: validOrgId,
      subscriberId: validSubscriberId,
      notificationId: validNotificationId,
      snoozeUntil,
    } as SnoozeNotificationCommand;
  }
});

import { NotFoundException } from '@nestjs/common';
import { CreateExecutionDetails, CreateExecutionDetailsCommand, PinoLogger } from '@novu/application-generic';
import { JobEntity, JobRepository, MessageEntity, MessageRepository } from '@novu/dal';
import { ChannelTypeEnum, JobStatusEnum, SeverityLevelEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { InboxNotification } from '../../utils/types';
import { MarkNotificationAsCommand } from '../mark-notification-as/mark-notification-as.command';
import { MarkNotificationAs } from '../mark-notification-as/mark-notification-as.usecase';
import { UnsnoozeNotificationCommand } from './unsnooze-notification.command';
import { UnsnoozeNotification } from './unsnooze-notification.usecase';

describe('UnsnoozeNotification', () => {
  const validNotificationId = '507f1f77bcf86cd799439011';
  const validEnvId = '507f1f77bcf86cd799439012';
  const validOrgId = '507f1f77bcf86cd799439013';
  const validJobId = '507f1f77bcf86cd799439014';
  const validSubscriberId = '507f1f77bcf86cd799439015';
  const validNotificationId2 = '507f1f77bcf86cd799439016';

  let unsnoozeNotification: UnsnoozeNotification;
  let loggerMock: sinon.SinonStubbedInstance<PinoLogger>;
  let messageRepositoryMock: sinon.SinonStubbedInstance<MessageRepository>;
  let jobRepositoryMock: sinon.SinonStubbedInstance<JobRepository>;
  let createExecutionDetailsMock: sinon.SinonStubbedInstance<CreateExecutionDetails>;
  let markNotificationAsMock: sinon.SinonStubbedInstance<MarkNotificationAs>;

  const snoozedUntil = new Date();
  snoozedUntil.setHours(snoozedUntil.getHours() + 1);

  const mockMessage = {
    _id: validNotificationId,
    _jobId: validJobId,
    _environmentId: validEnvId,
    channel: ChannelTypeEnum.IN_APP,
    _subscriberId: validSubscriberId,
    _notificationId: validNotificationId2,
    snoozedUntil,
  } as unknown as MessageEntity;

  const mockJob: JobEntity = {
    _id: validJobId,
    _environmentId: validEnvId,
    _organizationId: validOrgId,
    _userId: validSubscriberId,
    _notificationId: validNotificationId2,
    payload: {
      subscriberId: validSubscriberId,
      unsnooze: true,
    },
    transactionId: 'transaction-id',
    status: JobStatusEnum.PENDING,
    delay: 3600000,
  } as JobEntity;

  const mockNotification: InboxNotification = {
    id: validNotificationId,
    transactionId: 'transaction-id',
    body: 'Test notification content',
    to: {
      subscriberId: validSubscriberId,
      id: validSubscriberId,
    },
    isSeen: false,
    isRead: false,
    isArchived: false,
    isSnoozed: false,
    snoozedUntil: null,
    createdAt: new Date().toISOString(),
    channelType: ChannelTypeEnum.IN_APP,
    severity: SeverityLevelEnum.NONE,
  };

  beforeEach(() => {
    loggerMock = sinon.createStubInstance(PinoLogger);
    messageRepositoryMock = sinon.createStubInstance(MessageRepository);
    jobRepositoryMock = sinon.createStubInstance(JobRepository);
    createExecutionDetailsMock = sinon.createStubInstance(CreateExecutionDetails);
    markNotificationAsMock = sinon.createStubInstance(MarkNotificationAs);

    sinon.stub(MarkNotificationAsCommand, 'create').returns({
      environmentId: validEnvId,
      organizationId: validOrgId,
      subscriberId: validSubscriberId,
      notificationId: validNotificationId,
      snoozedUntil: null,
    } as MarkNotificationAsCommand);

    sinon.stub(CreateExecutionDetailsCommand, 'create').returns({} as any);
    sinon.stub(CreateExecutionDetailsCommand, 'getDetailsFromJob').returns({} as any);

    // @ts-expect-error Mocking the withTransaction method
    messageRepositoryMock.withTransaction = sinon.stub().callsFake((callback) => callback());

    unsnoozeNotification = new UnsnoozeNotification(
      loggerMock as any,
      messageRepositoryMock as any,
      jobRepositoryMock as any,
      markNotificationAsMock as any,
      createExecutionDetailsMock as any
    );

    jobRepositoryMock.findOneAndDelete.resolves(mockJob);
    markNotificationAsMock.execute.resolves(mockNotification);
    createExecutionDetailsMock.execute.resolves();
    messageRepositoryMock.findOne.resolves(mockMessage);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw NotFoundException when snoozed notification is not found', async () => {
    const command = createCommand();
    messageRepositoryMock.findOne.resolves(null);

    try {
      await unsnoozeNotification.execute(command);
      expect.fail('Should have thrown NotFoundException');
    } catch (err) {
      expect(err).to.be.instanceOf(NotFoundException);
    }
  });

  it('should successfully unsnooze a notification', async () => {
    const command = createCommand();

    const result = await unsnoozeNotification.execute(command);

    expect(result).to.deep.equal(mockNotification);
    expect(jobRepositoryMock.findOneAndDelete.calledOnce).to.be.true;
    expect(markNotificationAsMock.execute.calledOnce).to.be.true;

    // Verify that markNotificationAs was called with the correct args
    const markNotificationAsArgs = markNotificationAsMock.execute.firstCall.args[0];
    expect(markNotificationAsArgs).to.have.property('environmentId', validEnvId);
    expect(markNotificationAsArgs).to.have.property('subscriberId', validSubscriberId);
    expect(markNotificationAsArgs).to.have.property('notificationId', validNotificationId);
    expect(markNotificationAsArgs).to.have.property('snoozedUntil', null);

    // Verify that createExecutionDetails was called
    expect(createExecutionDetailsMock.execute.calledOnce).to.be.true;
  });

  it('should handle missing scheduled job gracefully', async () => {
    const command = createCommand();
    jobRepositoryMock.findOneAndDelete.resolves(null);

    const result = await unsnoozeNotification.execute(command);

    // Verify we still get a result even without a job
    expect(result).to.deep.equal(mockNotification);
    expect(jobRepositoryMock.findOneAndDelete.calledOnce).to.be.true;
    expect(markNotificationAsMock.execute.calledOnce).to.be.true;
    expect(createExecutionDetailsMock.execute.called).to.be.false;
    expect(loggerMock.error.calledOnce).to.be.true;
  });

  function createCommand(): UnsnoozeNotificationCommand {
    return {
      environmentId: validEnvId,
      organizationId: validOrgId,
      subscriberId: validSubscriberId,
      notificationId: validNotificationId,
    } as UnsnoozeNotificationCommand;
  }
});

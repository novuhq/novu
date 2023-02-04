import { MessageRepository, IntegrationRepository, SubscriberEntity, JobRepository } from '@novu/dal';
import { UserSession, SubscribersService } from '@novu/testing';
import * as sinon from 'sinon';

import { expect } from 'chai';
import { CHANNEL_TYPE_TO_STEP_TYPE, ChannelTypeEnum } from '@novu/shared';
import { RunJob } from '../usecases/run-job/run-job.usecase';
import { SendMessage } from '../usecases/send-message/send-message.usecase';
import { QueueNextJob } from '../usecases/queue-next-job/queue-next-job.usecase';
import { RunJobCommand } from '../usecases/run-job/run-job.command';
import { StorageHelperService } from '../services/storage-helper-service/storage-helper.service';
import { DetailEnum } from '../../execution-details/usecases/create-execution-details/create-execution-details.command';
import { BaseHandler } from '../services/mail-service/handlers/base.handler';
import { BaseSmsHandler } from '../services/sms-service/handlers/base.handler';
import { BaseChatHandler } from '../services/chat-service/handlers/base.handler';
import { BasePushHandler } from '../services/push-service/handlers/base.handler';
import { FCMHandler } from '../services/push-service/handlers';
import { ISendMessageSuccessResponse } from '@novu/stateless';

describe('Send messages by respecting limit rules', function () {
  let session: UserSession;
  let integrationRepository: IntegrationRepository;

  let subscriber: SubscriberEntity;
  let subscriberService: SubscribersService;
  const jobRepository = new JobRepository();
  let messageRepository: MessageRepository;
  let integrations;
  let runJob: RunJob;
  const channelsToTest = Object.values(ChannelTypeEnum).filter((channel) => channel != ChannelTypeEnum.IN_APP);

  beforeEach(async () => {
    session = new UserSession();
    await session.initialize();
    subscriberService = new SubscribersService(session.organization._id, session.environment._id);
    subscriber = await subscriberService.createSubscriber();
    messageRepository = session.testServer?.getService(MessageRepository);
    integrationRepository = session.testServer?.getService(IntegrationRepository);
    integrations = await integrationRepository.findByEnvironmentId(session.environment._id);
    runJob = new RunJob(
      jobRepository,
      session.testServer.getService(SendMessage),
      session.testServer.getService(QueueNextJob),
      session.testServer.getService(StorageHelperService)
    );
  });
  afterEach(() => {
    sinon.restore();
  });

  it(`should not send messages if hardLimit reached, for channels ${channelsToTest.join(', ')}`, async function () {
    //sinon.stub(MailFactory.prototype, 'getHandler').throws('Should not call this');
    const hardLimit = 50;
    const messageCount = hardLimit + 1;
    const limits = { softLimit: 20, hardLimit: hardLimit };
    for (const channel of channelsToTest) {
      sinon.restore();
      const handlerStub = createHandlerStub(channel);
      try {
        await triggerAndExecuteLimitScenarios(channel, limits, messageCount);
      } catch (e) {
        expect(e.message, `Expected exception not recieved for channel ${channel}`).to.equal(
          DetailEnum.PROVIDER_LIMIT_REACHED
        );
      }
      expect(handlerStub.notCalled, `haandler.send notCalled check failed for channel ${channel}`).to.equal(true);
    }
  });

  it(`should not stop sending messages if limit is null, for channels ${channelsToTest.join(', ')}`, async function () {
    const messageCount = 999999999999999; //limit null means no limit
    const limits = undefined;
    for (const channel of channelsToTest) {
      sinon.restore();
      const handlerStub = createHandlerStub(channel);
      const message = await triggerAndExecuteLimitScenarios(channel, limits, messageCount);
      expect(handlerStub.called, `${channel} handler.send calledOnce check failed`).to.equal(true);
      expect(message, `message not null check failed for ${channel}`).not.to.be.null;
    }
  });

  it(`should send messages if limit not reached, for channels ${channelsToTest.join(', ')}`, async function () {
    const hardLimit = 50;
    const messageCount = hardLimit - 1;
    const limits = { softLimit: 20, hardLimit: hardLimit };
    for (const channel of channelsToTest) {
      sinon.restore();
      const handlerStub = createHandlerStub(channel);
      const message = await triggerAndExecuteLimitScenarios(channel, limits, messageCount);
      expect(handlerStub.called, `${channel} handler.send calledOnce check failed`).to.equal(true);
      expect(message, `message not null check failed for ${channel}`).not.to.be.null;
    }
  });
  const fakeSend = (options) => new Promise<ISendMessageSuccessResponse>((resolve, reject) => resolve({}));
  const createHandlerStub = (channel: ChannelTypeEnum) => {
    switch (channel) {
      case ChannelTypeEnum.EMAIL:
        return sinon.stub(BaseHandler.prototype, 'send').callsFake(fakeSend);
      case ChannelTypeEnum.SMS:
        return sinon.stub(BaseSmsHandler.prototype, 'send').callsFake(fakeSend);
      case ChannelTypeEnum.CHAT:
        return sinon.stub(BaseChatHandler.prototype, 'send').callsFake(fakeSend);
      case ChannelTypeEnum.PUSH: {
        sinon.stub(FCMHandler.prototype, 'buildProvider').resolves(); //test creds not working for fcm

        return sinon.stub(BasePushHandler.prototype, 'send').callsFake(fakeSend);
      }
    }
  };

  const triggerAndExecuteLimitScenarios = async (channel, limits, messageCount) => {
    const integration = integrations.find((i) => i.channel === channel);
    const modifiedIntegration = { ...integration, limits: limits };
    const findStub = sinon.stub(integrationRepository, 'find').resolves([modifiedIntegration]);
    const findOneStub = sinon.stub(integrationRepository, 'findOne').resolves(modifiedIntegration);
    const countStub = sinon.stub(messageRepository, 'count').resolves(messageCount);

    const template = await session.createChannelTemplate(CHANNEL_TYPE_TO_STEP_TYPE.get(channel));
    await triggerEvent(template, {});

    await session.awaitRunningJobs(template?._id, true, 1);

    const job = await jobRepository.findOne({
      _environmentId: session.environment._id,
      _templateId: template._id,
      type: CHANNEL_TYPE_TO_STEP_TYPE.get(channel),
    });
    await runJob.execute(
      RunJobCommand.create({
        jobId: job._id,
        environmentId: job._environmentId,
        organizationId: job._organizationId,
        userId: job._userId,
      })
    );
    await session.awaitRunningJobs(template?._id, true, 0);

    return await messageRepository.findOne({
      _environmentId: session.environment._id,
      _subscriberId: subscriber._id,
      channel: channel,
    });
  };

  const triggerEvent = async (template, payload, transactionId?: string, overrides = {}) => {
    await session.testAgent.post('/v1/events/trigger').send({
      transactionId,
      name: template.triggers[0].identifier,
      to: [subscriber.subscriberId],
      payload,
      overrides,
    });
  };
});

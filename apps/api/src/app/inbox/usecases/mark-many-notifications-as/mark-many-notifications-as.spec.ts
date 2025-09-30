import { BadRequestException } from '@nestjs/common';
import {
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  PinoLogger,
  SendWebhookMessage,
  TraceLogRepository,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { ChannelTypeEnum, EnvironmentRepository, MessageRepository } from '@novu/dal';
import { ChannelCTATypeEnum, WebSocketEventEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import type { MarkManyNotificationsAsCommand } from './mark-many-notifications-as.command';
import { MarkManyNotificationsAs } from './mark-many-notifications-as.usecase';

const mockSubscriber: any = { _id: '123', subscriberId: 'test-mockSubscriber' };
const mockEnvironment: any = { _id: 'env-1', webhookAppId: 'webhook-app-id', identifier: 'test-env' };
const mockMessage: any = [
  {
    _id: '_id',
    content: '',
    read: false,
    archived: false,
    createdAt: new Date(),
    lastReadAt: new Date(),
    channel: ChannelTypeEnum.IN_APP,
    subscriber: mockSubscriber,
    actorSubscriber: mockSubscriber,
    cta: {
      type: ChannelCTATypeEnum.REDIRECT,
      data: {},
    },
  },
];

describe('MarkManyNotificationsAs', () => {
  let markManyNotificationsAs: MarkManyNotificationsAs;
  let invalidateCacheMock: sinon.SinonStubbedInstance<InvalidateCacheService>;
  let webSocketsQueueServiceMock: sinon.SinonStubbedInstance<WebSocketsQueueService>;
  let getSubscriberMock: sinon.SinonStubbedInstance<GetSubscriber>;
  let messageRepositoryMock: sinon.SinonStubbedInstance<MessageRepository>;
  let traceLogRepositoryMock: sinon.SinonStubbedInstance<TraceLogRepository>;
  let loggerMock: sinon.SinonStubbedInstance<PinoLogger>;
  let sendWebhookMessageMock: sinon.SinonStubbedInstance<SendWebhookMessage>;
  let environmentRepositoryMock: sinon.SinonStubbedInstance<EnvironmentRepository>;
  beforeEach(() => {
    invalidateCacheMock = sinon.createStubInstance(InvalidateCacheService);
    webSocketsQueueServiceMock = sinon.createStubInstance(WebSocketsQueueService);
    getSubscriberMock = sinon.createStubInstance(GetSubscriber);
    messageRepositoryMock = sinon.createStubInstance(MessageRepository);
    traceLogRepositoryMock = sinon.createStubInstance(TraceLogRepository);
    loggerMock = sinon.createStubInstance(PinoLogger);
    sendWebhookMessageMock = sinon.createStubInstance(SendWebhookMessage);
    environmentRepositoryMock = sinon.createStubInstance(EnvironmentRepository);
    markManyNotificationsAs = new MarkManyNotificationsAs(
      invalidateCacheMock as any,
      webSocketsQueueServiceMock as any,
      getSubscriberMock as any,
      messageRepositoryMock as any,
      traceLogRepositoryMock as any,
      loggerMock as any,
      sendWebhookMessageMock as any,
      environmentRepositoryMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw exception when subscriber is not found', async () => {
    const command: MarkManyNotificationsAsCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      ids: ['notification-id'],
      read: true,
    };

    getSubscriberMock.execute.resolves(undefined);

    try {
      await markManyNotificationsAs.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} is not found.`);
    }
  });

  it('should call the updateMessagesStatusByIds on the repository', async () => {
    const command: MarkManyNotificationsAsCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      ids: [mockMessage._id],
      read: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.updateMessagesStatusByIds.resolves(mockMessage);
    environmentRepositoryMock.findOne.resolves(mockEnvironment);

    await markManyNotificationsAs.execute(command);

    expect(messageRepositoryMock.updateMessagesStatusByIds.calledOnce).to.be.true;
    expect(messageRepositoryMock.updateMessagesStatusByIds.firstCall.args).to.deep.equal([
      {
        environmentId: command.environmentId,
        subscriberId: mockSubscriber._id,
        ids: command.ids,
        read: command.read,
        archived: command.archived,
        snoozedUntil: command.snoozedUntil,
      },
    ]);
  });

  it('should invalidate the cache', async () => {
    const command: MarkManyNotificationsAsCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      ids: [mockMessage._id],
      read: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);
    messageRepositoryMock.updateMessagesStatusByIds.resolves(mockMessage);
    environmentRepositoryMock.findOne.resolves(mockEnvironment);

    await markManyNotificationsAs.execute(command);

    expect(invalidateCacheMock.invalidateQuery.calledTwice).to.be.true;
    expect(invalidateCacheMock.invalidateQuery.firstCall.args).to.deep.equal([
      {
        key: buildFeedKey().invalidate({
          subscriberId: mockSubscriber.subscriberId,
          _environmentId: command.environmentId,
        }),
      },
    ]);
    expect(invalidateCacheMock.invalidateQuery.secondCall.args).to.deep.equal([
      {
        key: buildMessageCountKey().invalidate({
          subscriberId: mockSubscriber.subscriberId,
          _environmentId: command.environmentId,
        }),
      },
    ]);
  });

  it('should send the websocket unread event', async () => {
    const command: MarkManyNotificationsAsCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      ids: [mockMessage._id],
      read: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);
    messageRepositoryMock.updateMessagesStatusByIds.resolves(mockMessage);
    environmentRepositoryMock.findOne.resolves(mockEnvironment);

    await markManyNotificationsAs.execute(command);

    expect(webSocketsQueueServiceMock.add.calledOnce).to.be.true;
    expect(webSocketsQueueServiceMock.add.firstCall.args).to.deep.equal([
      {
        name: 'sendMessage',
        data: {
          event: WebSocketEventEnum.UNREAD,
          userId: mockSubscriber._id,
          _environmentId: mockSubscriber._environmentId,
        },
        groupId: mockSubscriber._organizationId,
      },
    ]);
  });
});

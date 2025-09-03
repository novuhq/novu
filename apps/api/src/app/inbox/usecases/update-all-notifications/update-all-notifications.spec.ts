import { BadRequestException } from '@nestjs/common';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  SendWebhookMessage,
  WebSocketsQueueService,
} from '@novu/application-generic';
import { EnvironmentRepository, MessageRepository } from '@novu/dal';
import { ChannelCTATypeEnum, ChannelTypeEnum, WebSocketEventEnum } from '@novu/shared';
import { expect } from 'chai';
import sinon from 'sinon';
import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { AnalyticsEventsEnum } from '../../utils';
import type { UpdateAllNotificationsCommand } from './update-all-notifications.command';
import { UpdateAllNotifications } from './update-all-notifications.usecase';

const mockSubscriber: any = { _id: '6447aff5d89122e250412c79', subscriberId: '6447aff5d89122e250412c79' };
const mockEnvironment: any = {
  _id: '6447aff3d89122e250412c23',
  webhookAppId: 'webhook-app-id',
  identifier: 'test-env',
};

describe('UpdateAllNotifications', () => {
  let updateAllNotifications: UpdateAllNotifications;
  let invalidateCacheMock: sinon.SinonStubbedInstance<InvalidateCacheService>;
  let getSubscriberMock: sinon.SinonStubbedInstance<GetSubscriber>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let messageRepositoryMock: sinon.SinonStubbedInstance<MessageRepository>;
  let webSocketsQueueServiceMock: sinon.SinonStubbedInstance<WebSocketsQueueService>;
  let sendWebhookMessageMock: sinon.SinonStubbedInstance<SendWebhookMessage>;
  let environmentRepositoryMock: sinon.SinonStubbedInstance<EnvironmentRepository>;
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

  beforeEach(() => {
    invalidateCacheMock = sinon.createStubInstance(InvalidateCacheService);
    getSubscriberMock = sinon.createStubInstance(GetSubscriber);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    messageRepositoryMock = sinon.createStubInstance(MessageRepository);
    webSocketsQueueServiceMock = sinon.createStubInstance(WebSocketsQueueService);
    sendWebhookMessageMock = sinon.createStubInstance(SendWebhookMessage);
    environmentRepositoryMock = sinon.createStubInstance(EnvironmentRepository);
    updateAllNotifications = new UpdateAllNotifications(
      invalidateCacheMock as any,
      getSubscriberMock as any,
      analyticsServiceMock as any,
      messageRepositoryMock as any,
      webSocketsQueueServiceMock as any,
      sendWebhookMessageMock as any,
      environmentRepositoryMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw exception when subscriber is not found', async () => {
    const command: UpdateAllNotificationsCommand = {
      environmentId: '6447aff3d89122e250412c23',
      organizationId: '6447aff3d89122e250412c1d',
      subscriberId: '6447aff5d89122e250412c79',
      from: { read: true },
      to: { archived: true },
    };

    getSubscriberMock.execute.resolves(undefined);

    try {
      await updateAllNotifications.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} is not found.`);
    }
  });

  it('should update all read to archived', async () => {
    const command: UpdateAllNotificationsCommand = {
      environmentId: '6447aff3d89122e250412c23',
      organizationId: '6447aff3d89122e250412c1d',
      subscriberId: '6447aff5d89122e250412c79',
      from: { read: true },
      to: { archived: true },
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.updateMessagesFromToStatus.resolves(mockMessage);
    environmentRepositoryMock.findOne.resolves(mockEnvironment);
    invalidateCacheMock.invalidateQuery.resolves();
    analyticsServiceMock.track.resolves();
    webSocketsQueueServiceMock.add.resolves();

    await updateAllNotifications.execute(command);

    expect(messageRepositoryMock.updateMessagesFromToStatus.calledOnce).to.be.true;
    expect(messageRepositoryMock.updateMessagesFromToStatus.firstCall.args).to.deep.equal([
      {
        environmentId: command.environmentId,
        subscriberId: mockSubscriber._id,
        from: command.from,
        to: command.to,
      },
    ]);
  });

  it('should invalidate cache, send the analytics, send ws event', async () => {
    const command: UpdateAllNotificationsCommand = {
      environmentId: '6447aff3d89122e250412c23',
      organizationId: '6447aff3d89122e250412c1d',
      subscriberId: '6447aff5d89122e250412c79',
      from: { read: true },
      to: { archived: true },
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.updateMessagesFromToStatus.resolves(mockMessage);
    environmentRepositoryMock.findOne.resolves(mockEnvironment);
    invalidateCacheMock.invalidateQuery.resolves();
    analyticsServiceMock.track.resolves();
    webSocketsQueueServiceMock.add.resolves();

    await updateAllNotifications.execute(command);

    expect(invalidateCacheMock.invalidateQuery.calledTwice).to.be.true;
    expect(invalidateCacheMock.invalidateQuery.firstCall.args).to.deep.equal([
      {
        key: buildFeedKey().invalidate({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      },
    ]);
    expect(invalidateCacheMock.invalidateQuery.secondCall.args).to.deep.equal([
      {
        key: buildMessageCountKey().invalidate({
          subscriberId: command.subscriberId,
          _environmentId: command.environmentId,
        }),
      },
    ]);
    expect(analyticsServiceMock.track.calledOnce).to.be.true;
    expect(analyticsServiceMock.track.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.UPDATE_ALL_NOTIFICATIONS,
      '',
      {
        _organization: command.organizationId,
        _subscriberId: mockSubscriber._id,
        from: command.from,
        to: command.to,
      },
    ]);
    expect(webSocketsQueueServiceMock.add.calledOnce).to.be.true;
    expect(webSocketsQueueServiceMock.add.firstCall.args).to.deep.equal([
      {
        name: 'sendMessage',
        data: {
          event: WebSocketEventEnum.UNREAD,
          userId: mockSubscriber._id,
          _environmentId: command.environmentId,
        },
        groupId: mockSubscriber._organizationId,
      },
    ]);
  });
});

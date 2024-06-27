import * as sinon from 'sinon';
import { expect } from 'chai';
import { NotFoundException } from '@nestjs/common';
import { ButtonTypeEnum, ChannelCTATypeEnum, MessageActionStatusEnum, WebSocketEventEnum } from '@novu/shared';
import { ChannelTypeEnum, MessageRepository } from '@novu/dal';
import {
  AnalyticsService,
  buildFeedKey,
  buildMessageCountKey,
  InvalidateCacheService,
  WebSocketsQueueService,
} from '@novu/application-generic';

import { UpdateNotification } from './update-notification.usecase';
import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import type { UpdateNotificationCommand } from './update-notification.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { mapToDto } from '../../utils/notification-mapper';
import { AnalyticsEventsEnum } from '../../utils';

const mockSubscriber: any = { _id: '123', subscriberId: 'test-mockSubscriber' };
const mockMessage: any = {
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
};
const mockMessageWithButtons: any = {
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
    action: {
      buttons: [
        { type: ButtonTypeEnum.PRIMARY, content: '' },
        { type: ButtonTypeEnum.SECONDARY, content: '' },
      ],
    },
  },
};

describe('UpdateNotification', () => {
  let updateNotification: UpdateNotification;
  let invalidateCacheMock: sinon.SinonStubbedInstance<InvalidateCacheService>;
  let webSocketsQueueServiceMock: sinon.SinonStubbedInstance<WebSocketsQueueService>;
  let getSubscriberMock: sinon.SinonStubbedInstance<GetSubscriber>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let messageRepositoryMock: sinon.SinonStubbedInstance<MessageRepository>;

  beforeEach(() => {
    invalidateCacheMock = sinon.createStubInstance(InvalidateCacheService);
    webSocketsQueueServiceMock = sinon.createStubInstance(WebSocketsQueueService);
    getSubscriberMock = sinon.createStubInstance(GetSubscriber);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    messageRepositoryMock = sinon.createStubInstance(MessageRepository);

    updateNotification = new UpdateNotification(
      invalidateCacheMock as any,
      webSocketsQueueServiceMock as any,
      getSubscriberMock as any,
      analyticsServiceMock as any,
      messageRepositoryMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw exception when subscriber is not found', async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: 'notification-id',
      read: true,
    };

    getSubscriberMock.execute.resolves(undefined);

    try {
      await updateNotification.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(ApiException);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} is not found.`);
    }
  });

  it('should throw exception when the message is not found', async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: 'notification-id',
      read: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(undefined);

    try {
      await updateNotification.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
      expect(error.message).to.equal(`Notification with id: ${command.notificationId} is not found.`);
    }
  });

  it("should throw exception when the message doesn't have the primary button", async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      read: true,
      primaryActionCompleted: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);

    try {
      await updateNotification.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(ApiException);
      expect(error.message).to.equal(`Could not perform action on the primary button.`);
    }
  });

  it("should throw exception when the message doesn't have the secondary button", async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      read: true,
      secondaryActionCompleted: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);

    try {
      await updateNotification.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(ApiException);
      expect(error.message).to.equal(`Could not perform action on the secondary button.`);
    }
  });

  it('should update the message read status', async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      read: true,
    };
    const updatedMessageMock = { ...mockMessage, read: true };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.onFirstCall().resolves(mockMessage);
    messageRepositoryMock.findOne.onSecondCall().resolves(updatedMessageMock);

    const updatedMessage = await updateNotification.execute(command);

    expect(messageRepositoryMock.update.calledOnce).to.be.true;
    expect(messageRepositoryMock.update.firstCall.args).to.deep.equal([
      {
        _environmentId: command.environmentId,
        _subscriberId: mockSubscriber._id,
        _id: command.notificationId,
      },
      {
        $set: { read: true },
      },
    ]);
    expect(mapToDto(updatedMessageMock)).to.deep.equal(updatedMessage);
  });

  it('should update the message archived status', async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      archived: true,
    };
    const updatedMessageMock = { ...mockMessage, archived: true };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.onFirstCall().resolves(mockMessage);
    messageRepositoryMock.findOne.onSecondCall().resolves(updatedMessageMock);

    const updatedMessage = await updateNotification.execute(command);

    expect(messageRepositoryMock.update.calledOnce).to.be.true;
    expect(messageRepositoryMock.update.firstCall.args).to.deep.equal([
      {
        _environmentId: command.environmentId,
        _subscriberId: mockSubscriber._id,
        _id: command.notificationId,
      },
      {
        $set: { archived: true },
      },
    ]);
    expect(mapToDto(updatedMessageMock)).to.deep.equal(updatedMessage);
  });

  it('should update the message primary button status', async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessageWithButtons._id,
      primaryActionCompleted: true,
    };
    const updatedMessageWithButtonsMock = {
      ...mockMessageWithButtons,
      cta: {
        ...mockMessageWithButtons.cta,
        action: {
          ...mockMessageWithButtons.cta.action,
          status: MessageActionStatusEnum.DONE,
          result: { ...mockMessageWithButtons.cta.action.result, type: ButtonTypeEnum.PRIMARY },
        },
      },
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.onFirstCall().resolves(mockMessageWithButtons);
    messageRepositoryMock.findOne.onSecondCall().resolves(updatedMessageWithButtonsMock);

    const updatedMessage = await updateNotification.execute(command);

    expect(messageRepositoryMock.update.calledOnce).to.be.true;
    expect(messageRepositoryMock.update.firstCall.args).to.deep.equal([
      {
        _environmentId: command.environmentId,
        _subscriberId: mockSubscriber._id,
        _id: command.notificationId,
      },
      {
        $set: { 'cta.action.result.type': ButtonTypeEnum.PRIMARY, 'cta.action.status': MessageActionStatusEnum.DONE },
      },
    ]);
    expect(mapToDto(updatedMessageWithButtonsMock)).to.deep.equal(updatedMessage);
    expect(updatedMessage.primaryAction?.isCompleted).to.be.true;
    expect(updatedMessage.secondaryAction?.isCompleted).to.be.false;
  });

  it('should update the message secondary button status', async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessageWithButtons._id,
      secondaryActionCompleted: true,
    };
    const updatedMessageWithButtonsMock = {
      ...mockMessageWithButtons,
      cta: {
        ...mockMessageWithButtons.cta,
        action: {
          ...mockMessageWithButtons.cta.action,
          status: MessageActionStatusEnum.DONE,
          result: { ...mockMessageWithButtons.cta.action.result, type: ButtonTypeEnum.SECONDARY },
        },
      },
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.onFirstCall().resolves(mockMessageWithButtons);
    messageRepositoryMock.findOne.onSecondCall().resolves(updatedMessageWithButtonsMock);

    const updatedMessage = await updateNotification.execute(command);

    expect(messageRepositoryMock.update.calledOnce).to.be.true;
    expect(messageRepositoryMock.update.firstCall.args).to.deep.equal([
      {
        _environmentId: command.environmentId,
        _subscriberId: mockSubscriber._id,
        _id: command.notificationId,
      },
      {
        $set: { 'cta.action.result.type': ButtonTypeEnum.SECONDARY, 'cta.action.status': MessageActionStatusEnum.DONE },
      },
    ]);
    expect(mapToDto(updatedMessageWithButtonsMock)).to.deep.equal(updatedMessage);
    expect(updatedMessage.primaryAction?.isCompleted).to.be.false;
    expect(updatedMessage.secondaryAction?.isCompleted).to.be.true;
  });

  it('should invalidate the cache', async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      read: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);

    await updateNotification.execute(command);

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

  it('should send the analytics', async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      read: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);

    await updateNotification.execute(command);

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.UPDATE_NOTIFICATION,
      '',
      {
        _organization: command.organizationId,
        _subscriber: mockSubscriber._id,
        _notification: command.notificationId,
        read: command.read,
        archived: command.archived,
        primaryActionCompleted: command.primaryActionCompleted,
        secondaryActionCompleted: command.secondaryActionCompleted,
      },
    ]);
  });

  it('should send the websocket unread event', async () => {
    const command: UpdateNotificationCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      read: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);

    await updateNotification.execute(command);

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

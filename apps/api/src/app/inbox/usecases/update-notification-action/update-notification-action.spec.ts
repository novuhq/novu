import sinon from 'sinon';
import { expect } from 'chai';
import { NotFoundException } from '@nestjs/common';
import { ButtonTypeEnum, ChannelCTATypeEnum, MessageActionStatusEnum } from '@novu/shared';
import { ChannelTypeEnum, MessageRepository } from '@novu/dal';
import { AnalyticsService, buildFeedKey, InvalidateCacheService } from '@novu/application-generic';

import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import { UpdateNotificationAction } from './update-notification-action.usecase';
import type { UpdateNotificationActionCommand } from './update-notification-action.command';
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

describe('UpdateNotificationAction', () => {
  let updateNotificationAction: UpdateNotificationAction;
  let invalidateCacheMock: sinon.SinonStubbedInstance<InvalidateCacheService>;
  let getSubscriberMock: sinon.SinonStubbedInstance<GetSubscriber>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let messageRepositoryMock: sinon.SinonStubbedInstance<MessageRepository>;

  beforeEach(() => {
    invalidateCacheMock = sinon.createStubInstance(InvalidateCacheService);
    getSubscriberMock = sinon.createStubInstance(GetSubscriber);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    messageRepositoryMock = sinon.createStubInstance(MessageRepository);

    updateNotificationAction = new UpdateNotificationAction(
      invalidateCacheMock as any,
      getSubscriberMock as any,
      analyticsServiceMock as any,
      messageRepositoryMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw exception when subscriber is not found', async () => {
    const command: UpdateNotificationActionCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: 'notification-id',
      actionType: ButtonTypeEnum.PRIMARY,
      actionStatus: MessageActionStatusEnum.DONE,
    };

    getSubscriberMock.execute.resolves(undefined);

    try {
      await updateNotificationAction.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(ApiException);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} is not found.`);
    }
  });

  it('should throw exception when the notification is not found', async () => {
    const command: UpdateNotificationActionCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: 'notification-id',
      actionType: ButtonTypeEnum.PRIMARY,
      actionStatus: MessageActionStatusEnum.DONE,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(undefined);

    try {
      await updateNotificationAction.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
      expect(error.message).to.equal(`Notification with id: ${command.notificationId} is not found.`);
    }
  });

  it("should throw exception when the notification doesn't have the primary button", async () => {
    const command: UpdateNotificationActionCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      actionType: ButtonTypeEnum.PRIMARY,
      actionStatus: MessageActionStatusEnum.DONE,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);

    try {
      await updateNotificationAction.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(ApiException);
      expect(error.message).to.equal(`Could not perform action on the primary button because it does not exist.`);
    }
  });

  it("should throw exception when the notification doesn't have the secondary button", async () => {
    const command: UpdateNotificationActionCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      actionType: ButtonTypeEnum.SECONDARY,
      actionStatus: MessageActionStatusEnum.DONE,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);

    try {
      await updateNotificationAction.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(ApiException);
      expect(error.message).to.equal(`Could not perform action on the secondary button because it does not exist.`);
    }
  });

  it('should update the notification action status', async () => {
    const command: UpdateNotificationActionCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessageWithButtons._id,
      actionType: ButtonTypeEnum.PRIMARY,
      actionStatus: MessageActionStatusEnum.DONE,
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
    messageRepositoryMock.updateActionStatus.resolves();

    const updatedMessage = await updateNotificationAction.execute(command);

    expect(messageRepositoryMock.updateActionStatus.calledOnce).to.be.true;
    expect(messageRepositoryMock.updateActionStatus.firstCall.args).to.deep.equal([
      {
        environmentId: command.environmentId,
        subscriberId: mockSubscriber._id,
        id: command.notificationId,
        actionType: command.actionType,
        actionStatus: command.actionStatus,
      },
    ]);
    expect(mapToDto(updatedMessageWithButtonsMock)).to.deep.equal(updatedMessage);
    expect(updatedMessage.primaryAction?.isCompleted).to.be.true;
    expect(updatedMessage.secondaryAction?.isCompleted).to.be.false;
  });

  it('should invalidate the cache', async () => {
    const command: UpdateNotificationActionCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      actionType: ButtonTypeEnum.PRIMARY,
      actionStatus: MessageActionStatusEnum.DONE,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessageWithButtons);
    messageRepositoryMock.updateActionStatus.resolves();

    await updateNotificationAction.execute(command);

    expect(invalidateCacheMock.invalidateQuery.calledOnce).to.be.true;
    expect(invalidateCacheMock.invalidateQuery.firstCall.args).to.deep.equal([
      {
        key: buildFeedKey().invalidate({
          subscriberId: mockSubscriber.subscriberId,
          _environmentId: command.environmentId,
        }),
      },
    ]);
  });

  it('should send the analytics', async () => {
    const command: UpdateNotificationActionCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      notificationId: mockMessage._id,
      actionType: ButtonTypeEnum.PRIMARY,
      actionStatus: MessageActionStatusEnum.DONE,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessageWithButtons);
    messageRepositoryMock.updateActionStatus.resolves();

    await updateNotificationAction.execute(command);

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.UPDATE_NOTIFICATION_ACTION,
      '',
      {
        _organization: command.organizationId,
        _subscriber: mockSubscriber._id,
        _notification: command.notificationId,
        actionType: ButtonTypeEnum.PRIMARY,
        actionStatus: MessageActionStatusEnum.DONE,
      },
    ]);
  });
});

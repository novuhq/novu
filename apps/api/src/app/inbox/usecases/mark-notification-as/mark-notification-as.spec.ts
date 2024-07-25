import sinon from 'sinon';
import { expect } from 'chai';
import { NotFoundException } from '@nestjs/common';
import { ChannelCTATypeEnum } from '@novu/shared';
import { ChannelTypeEnum, MessageRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { MarkNotificationAs } from './mark-notification-as.usecase';
import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import type { MarkNotificationAsCommand } from './mark-notification-as.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { mapToDto } from '../../utils/notification-mapper';
import { AnalyticsEventsEnum } from '../../utils';
import { MarkManyNotificationsAs } from '../mark-many-notifications-as/mark-many-notifications-as.usecase';
import { MarkManyNotificationsAsCommand } from '../mark-many-notifications-as/mark-many-notifications-as.command';

const mockSubscriber: any = { _id: '6447aff5d89122e250412c79', subscriberId: '6447aff5d89122e250412c79' };
const mockMessage: any = {
  _id: '666c0dfa0b55d0f06f4aaa6c',
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

describe('MarkNotificationAs', () => {
  let updateNotification: MarkNotificationAs;
  let markManyNotificationsAsMock: sinon.SinonStubbedInstance<MarkManyNotificationsAs>;
  let getSubscriberMock: sinon.SinonStubbedInstance<GetSubscriber>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;
  let messageRepositoryMock: sinon.SinonStubbedInstance<MessageRepository>;

  beforeEach(() => {
    markManyNotificationsAsMock = sinon.createStubInstance(MarkManyNotificationsAs);
    getSubscriberMock = sinon.createStubInstance(GetSubscriber);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);
    messageRepositoryMock = sinon.createStubInstance(MessageRepository);

    updateNotification = new MarkNotificationAs(
      markManyNotificationsAsMock as any,
      getSubscriberMock as any,
      analyticsServiceMock as any,
      messageRepositoryMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw exception when subscriber is not found', async () => {
    const command: MarkNotificationAsCommand = {
      environmentId: '6447aff3d89122e250412c23',
      organizationId: '6447aff3d89122e250412c1d',
      subscriberId: '6447aff5d89122e250412c79',
      notificationId: '666c0dfa0b55d0f06f4aaa1f',
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
    const command: MarkNotificationAsCommand = {
      environmentId: '6447aff3d89122e250412c23',
      organizationId: '6447aff3d89122e250412c1d',
      subscriberId: '6447aff5d89122e250412c79',
      notificationId: '666c0dfa0b55d0f06f4aaa1f',
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

  it('should call the mark many notifications usecase to update the status', async () => {
    const command: MarkNotificationAsCommand = {
      environmentId: '6447aff3d89122e250412c23',
      organizationId: '6447aff3d89122e250412c1d',
      subscriberId: '6447aff5d89122e250412c79',
      notificationId: mockMessage._id,
      read: true,
    };
    const updatedMessageMock = { ...mockMessage, read: true };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.onFirstCall().resolves(mockMessage);
    messageRepositoryMock.findOne.onSecondCall().resolves(updatedMessageMock);
    markManyNotificationsAsMock.execute.resolves();

    const updatedMessage = await updateNotification.execute(command);

    expect(markManyNotificationsAsMock.execute.calledOnce).to.be.true;
    expect(markManyNotificationsAsMock.execute.firstCall.args).to.deep.equal([
      MarkManyNotificationsAsCommand.create({
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        subscriberId: command.subscriberId,
        ids: [command.notificationId],
        read: command.read,
        archived: command.archived,
      }),
    ]);
    expect(mapToDto(updatedMessageMock)).to.deep.equal(updatedMessage);
  });

  it('should send the analytics', async () => {
    const command: MarkNotificationAsCommand = {
      environmentId: '6447aff3d89122e250412c23',
      organizationId: '6447aff3d89122e250412c1d',
      subscriberId: '6447aff5d89122e250412c79',
      notificationId: mockMessage._id,
      read: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.findOne.resolves(mockMessage);

    await updateNotification.execute(command);

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.MARK_NOTIFICATION_AS,
      '',
      {
        _organization: command.organizationId,
        _subscriber: mockSubscriber._id,
        _notification: command.notificationId,
        read: command.read,
        archived: command.archived,
      },
    ]);
  });
});

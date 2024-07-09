import sinon from 'sinon';
import { expect } from 'chai';
import { ChannelCTATypeEnum } from '@novu/shared';
import { ChannelTypeEnum, MessageRepository } from '@novu/dal';
import { AnalyticsService } from '@novu/application-generic';

import { GetNotifications } from './get-notifications.usecase';
import { GetSubscriber } from '../../../subscribers/usecases/get-subscriber';
import type { GetNotificationsCommand } from './get-notifications.command';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { mapToDto } from '../../utils/notification-mapper';
import { AnalyticsEventsEnum } from '../../utils';

const mockSubscriber: any = { _id: '123', subscriberId: 'test-mockSubscriber' };
const mockMessages: any = [
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

describe('GetNotifications', () => {
  let getNotifications: GetNotifications;
  let getSubscriberMock: sinon.SinonStubbedInstance<GetSubscriber>;
  let messageRepositoryMock: sinon.SinonStubbedInstance<MessageRepository>;
  let analyticsServiceMock: sinon.SinonStubbedInstance<AnalyticsService>;

  beforeEach(() => {
    getSubscriberMock = sinon.createStubInstance(GetSubscriber);
    messageRepositoryMock = sinon.createStubInstance(MessageRepository);
    analyticsServiceMock = sinon.createStubInstance(AnalyticsService);

    getNotifications = new GetNotifications(
      getSubscriberMock as any,
      analyticsServiceMock as any,
      messageRepositoryMock as any
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('it should throw exception when subscriber is not found', async () => {
    const command: GetNotificationsCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      limit: 10,
      offset: 0,
    };

    getSubscriberMock.execute.resolves(undefined);

    try {
      await getNotifications.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(ApiException);
      expect(error.message).to.equal(`Subscriber with id: ${command.subscriberId} is not found.`);
    }
  });

  it('it should throw exception when filtering for unread and archived notifications', async () => {
    const command: GetNotificationsCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: 'not-found',
      limit: 10,
      offset: 0,
      read: false,
      archived: true,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);

    try {
      await getNotifications.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(ApiException);
      expect(error.message).to.equal(`Filtering for unread and archived notifications is not supported.`);
    }
  });

  it("should not track analytics when doesn't have any data", async () => {
    const command: GetNotificationsCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: mockSubscriber.subscriberId,
      limit: 10,
      offset: 0,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.paginate.resolves({ data: [], hasMore: false });

    await getNotifications.execute(command);

    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.false;
  });

  it('should return the paginated data with filters', async () => {
    const command: GetNotificationsCommand = {
      environmentId: 'env-1',
      organizationId: 'org-1',
      subscriberId: mockSubscriber.subscriberId,
      limit: 10,
      offset: 0,
    };

    getSubscriberMock.execute.resolves(mockSubscriber);
    messageRepositoryMock.paginate.resolves({ data: mockMessages, hasMore: false });

    const result = await getNotifications.execute(command);

    expect(result.data).to.deep.equal(mapToDto(mockMessages));
    expect(result.filter).to.deep.equal({
      tags: command.tags,
      read: command.read,
      archived: command.archived,
    });
    expect(result.hasMore).to.be.false;
    expect(analyticsServiceMock.mixpanelTrack.calledOnce).to.be.true;
    expect(analyticsServiceMock.mixpanelTrack.firstCall.args).to.deep.equal([
      AnalyticsEventsEnum.FETCH_NOTIFICATIONS,
      '',
      {
        _subscriber: mockSubscriber.subscriberId,
        _organization: command.organizationId,
        feedSize: mockMessages.length,
      },
    ]);
  });
});

import sinon from 'sinon';
import { expect } from 'chai';
import { NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { AnalyticsService, CreateSubscriber, SelectIntegration, AuthService } from '@novu/application-generic';
import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';

import { Session } from './session.usecase';
import { ApiException } from '../../../shared/exceptions/api.exception';
import { SessionCommand } from './session.command';
import { SubscriberSessionResponseDto } from '../../dtos/subscriber-session-response.dto';
import { AnalyticsEventsEnum } from '../../utils';
// eslint-disable-next-line import/no-namespace
import * as encryption from '../../utils/encryption';
import { NotificationsCount } from '../notifications-count/notifications-count.usecase';

const mockIntegration = {
  _id: '_id',
  _environmentId: '_environmentId',
  _organizationId: '_organizationId',
  providerId: InAppProviderIdEnum.Novu,
  channel: ChannelTypeEnum.IN_APP,
  credentials: { hmac: true },
  active: true,
  name: 'In-App Integration',
  identifier: 'in-app-integration',
  primary: true,
  priority: 1,
  deleted: false,
  deletedAt: '',
  deletedBy: '',
};

describe('Session', () => {
  let session: Session;
  let environmentRepository: sinon.SinonStubbedInstance<EnvironmentRepository>;
  let createSubscriber: sinon.SinonStubbedInstance<CreateSubscriber>;
  let authService: sinon.SinonStubbedInstance<AuthService>;
  let selectIntegration: sinon.SinonStubbedInstance<SelectIntegration>;
  let analyticsService: sinon.SinonStubbedInstance<AnalyticsService>;
  let notificationsCount: sinon.SinonStubbedInstance<NotificationsCount>;

  beforeEach(() => {
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    createSubscriber = sinon.createStubInstance(CreateSubscriber);
    authService = sinon.createStubInstance(AuthService);
    selectIntegration = sinon.createStubInstance(SelectIntegration);
    analyticsService = sinon.createStubInstance(AnalyticsService);
    notificationsCount = sinon.createStubInstance(NotificationsCount);

    session = new Session(
      environmentRepository as any,
      createSubscriber as any,
      authService as any,
      selectIntegration as any,
      analyticsService as any,
      notificationsCount as any
    );
  });

  it('should throw an error if the environment is not found', async () => {
    const command: SessionCommand = {
      applicationIdentifier: 'invalid-app-id',
      subscriberId: 'subscriber-id',
    };

    environmentRepository.findEnvironmentByIdentifier.resolves(null);

    try {
      await session.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(ApiException);
      expect(error.message).to.equal('Please provide a valid application identifier');
    }
  });

  it('should throw an error if the in-app integration is not found', async () => {
    const command: SessionCommand = {
      applicationIdentifier: 'app-id',
      subscriberId: 'subscriber-id',
    };

    environmentRepository.findEnvironmentByIdentifier.resolves({
      _id: 'env-id',
      _organizationId: 'org-id',
      apiKeys: [{ key: 'api-key', _userId: 'user-id' }],
    } as any);
    selectIntegration.execute.resolves(undefined);

    try {
      await session.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundException);
      expect(error.message).to.equal('The active in-app integration could not be found');
    }
  });

  it('should validate HMAC encryption and return the session response', async () => {
    const command: SessionCommand = {
      applicationIdentifier: 'app-id',
      subscriberId: 'subscriber-id',
      subscriberHash: 'hash',
    };
    const subscriber = { _id: 'subscriber-id' };
    const notificationCount = { data: [{ count: 10, filter: {} }] };
    const token = 'token';

    environmentRepository.findEnvironmentByIdentifier.resolves({
      _id: 'env-id',
      _organizationId: 'org-id',
      apiKeys: [{ key: 'api-key', _userId: 'user-id' }],
    } as any);
    selectIntegration.execute.resolves(mockIntegration);
    createSubscriber.execute.resolves(subscriber as any);
    notificationsCount.execute.resolves(notificationCount);
    authService.getSubscriberWidgetToken.resolves(token);

    const validateHmacEncryptionStub = sinon.stub(encryption, 'validateHmacEncryption');

    await session.execute(command);

    expect(validateHmacEncryptionStub.calledOnce).to.be.true;
    validateHmacEncryptionStub.restore();
  });

  it('should return correct removeNovuBranding value when is set on the integration', async () => {
    const command: SessionCommand = {
      applicationIdentifier: 'app-id',
      subscriberId: 'subscriber-id',
      subscriberHash: 'hash',
    };
    const subscriber = { _id: 'subscriber-id' };
    const environment = { _id: 'env-id', _organizationId: 'org-id', name: 'env-name', apiKeys: [{ key: 'api-key' }] };
    const integrationWithoutRemoveNovuBranding = { ...mockIntegration, credentials: { hmac: false } };
    const notificationCount = { data: [{ count: 10, filter: {} }] };
    const token = 'token';

    environmentRepository.findEnvironmentByIdentifier.resolves(environment as any);
    selectIntegration.execute.resolves(integrationWithoutRemoveNovuBranding);
    createSubscriber.execute.resolves(subscriber as any);
    notificationsCount.execute.resolves(notificationCount);
    authService.getSubscriberWidgetToken.resolves(token);

    const response: SubscriberSessionResponseDto = await session.execute(command);

    expect(response.removeNovuBranding).to.equal(false);

    const integrationWithInvalidRemoveNovuBranding = {
      ...mockIntegration,
      credentials: { hmac: false },
      removeNovuBranding: false,
    };
    selectIntegration.execute.resolves(integrationWithInvalidRemoveNovuBranding as any);

    const responseWithRemoveNovuBranding: SubscriberSessionResponseDto = await session.execute(command);

    expect(responseWithRemoveNovuBranding.removeNovuBranding).to.equal(false);

    const integrationWithValidRemoveNovuBranding = {
      ...mockIntegration,
      credentials: { hmac: false },
      removeNovuBranding: true,
    };
    selectIntegration.execute.resolves(integrationWithValidRemoveNovuBranding);

    const responseWithValidRemoveNovuBranding: SubscriberSessionResponseDto = await session.execute(command);

    expect(responseWithValidRemoveNovuBranding.removeNovuBranding).to.equal(true);
  });

  it('should create a subscriber and return the session response', async () => {
    const command: SessionCommand = {
      applicationIdentifier: 'app-id',
      subscriberId: 'subscriber-id',
      subscriberHash: 'hash',
    };

    const environment = { _id: 'env-id', _organizationId: 'org-id', name: 'env-name', apiKeys: [{ key: 'api-key' }] };
    const integration = { ...mockIntegration, credentials: { hmac: false } };
    const subscriber = { _id: 'subscriber-id' };
    const notificationCount = { data: [{ count: 10, filter: {} }] };
    const token = 'token';

    environmentRepository.findEnvironmentByIdentifier.resolves(environment as any);
    selectIntegration.execute.resolves(integration);
    createSubscriber.execute.resolves(subscriber as any);
    notificationsCount.execute.resolves(notificationCount);
    authService.getSubscriberWidgetToken.resolves(token);

    const response: SubscriberSessionResponseDto = await session.execute(command);

    expect(response.token).to.equal(token);
    expect(response.totalUnreadCount).to.equal(notificationCount.data[0].count);
    expect(
      analyticsService.mixpanelTrack.calledOnceWith(AnalyticsEventsEnum.SESSION_INITIALIZED, '', {
        _organization: environment._organizationId,
        environmentName: environment.name,
        _subscriber: subscriber._id,
      })
    ).to.be.true;
  });
});

import sinon from 'sinon';
import { expect } from 'chai';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import {
  CommunityOrganizationRepository,
  EnvironmentRepository,
  IntegrationRepository,
  NotificationTemplateRepository,
  MessageTemplateRepository,
  PreferencesRepository,
  CommunityUserRepository,
} from '@novu/dal';
import {
  AnalyticsService,
  CreateOrUpdateSubscriberUseCase,
  FeatureFlagsService,
  PinoLogger,
  SelectIntegration,
  UpsertControlValuesUseCase,
} from '@novu/application-generic';
import { ApiServiceLevelEnum, ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import { AuthService } from '../../../auth/services/auth.service';
import { Session } from './session.usecase';
import { SessionCommand } from './session.command';
import { SubscriberSessionResponseDto } from '../../dtos/subscriber-session-response.dto';
import { AnalyticsEventsEnum } from '../../utils';
// eslint-disable-next-line import/no-namespace
import * as encryption from '../../utils/encryption';
import { NotificationsCount } from '../notifications-count/notifications-count.usecase';
import { GenerateUniqueApiKey } from '../../../environments-v1/usecases/generate-unique-api-key/generate-unique-api-key.usecase';
import { CreateNovuIntegrations } from '../../../integrations/usecases/create-novu-integrations/create-novu-integrations.usecase';
import { GetOrganizationSettings } from '../../../organization/usecases/get-organization-settings/get-organization-settings.usecase';

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
  let createSubscriber: sinon.SinonStubbedInstance<CreateOrUpdateSubscriberUseCase>;
  let authService: sinon.SinonStubbedInstance<AuthService>;
  let selectIntegration: sinon.SinonStubbedInstance<SelectIntegration>;
  let analyticsService: sinon.SinonStubbedInstance<AnalyticsService>;
  let notificationsCount: sinon.SinonStubbedInstance<NotificationsCount>;
  let integrationRepository: sinon.SinonStubbedInstance<IntegrationRepository>;
  let organizationRepository: sinon.SinonStubbedInstance<CommunityOrganizationRepository>;
  let communityOrganizationRepository: sinon.SinonStubbedInstance<CommunityOrganizationRepository>;
  let generateUniqueApiKey: sinon.SinonStubbedInstance<GenerateUniqueApiKey>;
  let createNovuIntegrationsUsecase: sinon.SinonStubbedInstance<CreateNovuIntegrations>;
  let communityUserRepository: sinon.SinonStubbedInstance<CommunityUserRepository>;
  let notificationTemplateRepository: sinon.SinonStubbedInstance<NotificationTemplateRepository>;
  let messageTemplateRepository: sinon.SinonStubbedInstance<MessageTemplateRepository>;
  let preferencesRepository: sinon.SinonStubbedInstance<PreferencesRepository>;
  let upsertControlValuesUseCase: sinon.SinonStubbedInstance<UpsertControlValuesUseCase>;
  let getOrganizationSettingsUsecase: sinon.SinonStubbedInstance<GetOrganizationSettings>;
  let logger: sinon.SinonStubbedInstance<PinoLogger>;
  let featureFlagsService: sinon.SinonStubbedInstance<FeatureFlagsService>;

  beforeEach(() => {
    environmentRepository = sinon.createStubInstance(EnvironmentRepository);
    createSubscriber = sinon.createStubInstance(CreateOrUpdateSubscriberUseCase);
    authService = sinon.createStubInstance(AuthService);
    selectIntegration = sinon.createStubInstance(SelectIntegration);
    analyticsService = sinon.createStubInstance(AnalyticsService);
    notificationsCount = sinon.createStubInstance(NotificationsCount);
    integrationRepository = sinon.createStubInstance(IntegrationRepository);
    organizationRepository = sinon.createStubInstance(CommunityOrganizationRepository);
    communityOrganizationRepository = sinon.createStubInstance(CommunityOrganizationRepository);
    generateUniqueApiKey = sinon.createStubInstance(GenerateUniqueApiKey);
    createNovuIntegrationsUsecase = sinon.createStubInstance(CreateNovuIntegrations);
    communityUserRepository = sinon.createStubInstance(CommunityUserRepository);
    notificationTemplateRepository = sinon.createStubInstance(NotificationTemplateRepository);
    messageTemplateRepository = sinon.createStubInstance(MessageTemplateRepository);
    preferencesRepository = sinon.createStubInstance(PreferencesRepository);
    upsertControlValuesUseCase = sinon.createStubInstance(UpsertControlValuesUseCase);
    getOrganizationSettingsUsecase = sinon.createStubInstance(GetOrganizationSettings);
    logger = sinon.createStubInstance(PinoLogger);
    featureFlagsService = sinon.createStubInstance(FeatureFlagsService);

    session = new Session(
      environmentRepository as any,
      createSubscriber as any,
      authService as any,
      selectIntegration as any,
      analyticsService as any,
      notificationsCount as any,
      integrationRepository as any,
      organizationRepository as any,
      communityOrganizationRepository as any,
      generateUniqueApiKey as any,
      createNovuIntegrationsUsecase as any,
      communityUserRepository as any,
      notificationTemplateRepository as any,
      messageTemplateRepository as any,
      preferencesRepository as any,
      upsertControlValuesUseCase as any,
      getOrganizationSettingsUsecase as any,
      logger as any,
      featureFlagsService as any
    );
  });

  it('should throw an error if the environment is not found', async () => {
    const command: SessionCommand = {
      requestData: {
        applicationIdentifier: 'invalid-app-id',
        subscriber: {
          subscriberId: 'subscriber-id',
        },
      },
    };

    environmentRepository.findEnvironmentByIdentifier.resolves(null);

    try {
      await session.execute(command);
    } catch (error) {
      expect(error).to.be.instanceOf(BadRequestException);
      expect(error.message).to.equal('Please provide a valid application identifier');
    }
  });

  it('should throw an error if the in-app integration is not found', async () => {
    const command: SessionCommand = {
      requestData: {
        applicationIdentifier: 'app-id',
        subscriber: {
          subscriberId: 'subscriber-id',
        },
      },
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
      requestData: {
        applicationIdentifier: 'app-id',
        subscriber: {
          subscriberId: 'subscriber-id',
        },
        subscriberHash: 'hash',
      },
    };
    const subscriber = { _id: 'subscriber-id' };
    const notificationCount = { data: [{ count: 10, filter: {} }] };
    const token = 'token';

    environmentRepository.findEnvironmentByIdentifier.resolves({
      _id: 'env-id',
      _organizationId: 'org-id',
      apiKeys: [{ key: 'api-key', _userId: 'user-id' }],
      name: 'Development',
    } as any);
    selectIntegration.execute.resolves(mockIntegration);
    createSubscriber.execute.resolves(subscriber as any);
    notificationsCount.execute.resolves(notificationCount);
    authService.getSubscriberWidgetToken.resolves(token);
    getOrganizationSettingsUsecase.execute.resolves({
      removeNovuBranding: false,
      defaultLocale: 'en_US',
    });

    const validateHmacEncryptionStub = sinon.stub(encryption, 'validateHmacEncryption');

    await session.execute(command);

    expect(validateHmacEncryptionStub.calledOnce).to.be.true;
    validateHmacEncryptionStub.restore();
  });

  it('should return correct removeNovuBranding value when set on the organization', async () => {
    const command: SessionCommand = {
      requestData: {
        applicationIdentifier: 'app-id',
        subscriber: {
          subscriberId: 'subscriber-id',
        },
        subscriberHash: 'hash',
      },
    };
    const subscriber = { _id: 'subscriber-id' };
    const environment = { _id: 'env-id', _organizationId: 'org-id', name: 'env-name', apiKeys: [{ key: 'api-key' }] };
    const notificationCount = { data: [{ count: 10, filter: {} }] };
    const token = 'token';

    environmentRepository.findEnvironmentByIdentifier.resolves(environment as any);
    selectIntegration.execute.resolves({ ...mockIntegration, credentials: { hmac: false } });
    createSubscriber.execute.resolves(subscriber as any);
    notificationsCount.execute.resolves(notificationCount);
    authService.getSubscriberWidgetToken.resolves(token);

    getOrganizationSettingsUsecase.execute.resolves({
      removeNovuBranding: false,
      defaultLocale: 'en_US',
    });
    const response: SubscriberSessionResponseDto = await session.execute(command);
    expect(response.removeNovuBranding).to.equal(false);

    getOrganizationSettingsUsecase.execute.resolves({
      removeNovuBranding: true,
      defaultLocale: 'en_US',
    });
    const responseWithRemoveNovuBranding: SubscriberSessionResponseDto = await session.execute(command);
    expect(responseWithRemoveNovuBranding.removeNovuBranding).to.equal(true);
  });

  it('should create a subscriber and return the session response', async () => {
    const command: SessionCommand = {
      requestData: {
        applicationIdentifier: 'app-id',
        subscriber: {
          subscriberId: 'subscriber-id',
        },
        subscriberHash: 'hash',
      },
      origin: 'origin',
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
    getOrganizationSettingsUsecase.execute.resolves({
      removeNovuBranding: false,
      defaultLocale: 'en_US',
    });

    const response: SubscriberSessionResponseDto = await session.execute(command);

    expect(response.token).to.equal(token);
    expect(response.totalUnreadCount).to.equal(notificationCount.data[0].count);
    expect(
      analyticsService.mixpanelTrack.calledWith(AnalyticsEventsEnum.SESSION_INITIALIZED, '', {
        _organization: environment._organizationId,
        environmentName: environment.name,
        _subscriber: subscriber._id,
        origin: command.origin,
      })
    ).to.be.true;
  });

  it('should return the correct maxSnoozeDurationHours value for different service levels', async () => {
    const command: SessionCommand = {
      requestData: {
        applicationIdentifier: 'app-id',
        subscriber: { subscriberId: 'subscriber-id' },
        subscriberHash: 'hash',
      },
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
    getOrganizationSettingsUsecase.execute.resolves({
      removeNovuBranding: false,
      defaultLocale: 'en_US',
    });

    // FREE plan should have 24 hours max snooze duration
    organizationRepository.findOne.resolves({ apiServiceLevel: ApiServiceLevelEnum.FREE } as any);
    const freeResponse: SubscriberSessionResponseDto = await session.execute(command);
    expect(freeResponse.maxSnoozeDurationHours).to.equal(24);

    // PRO plan should have 90 days max snooze duration
    organizationRepository.findOne.resolves({ apiServiceLevel: ApiServiceLevelEnum.PRO } as any);
    const proResponse: SubscriberSessionResponseDto = await session.execute(command);
    expect(proResponse.maxSnoozeDurationHours).to.equal(90 * 24);

    // BUSINESS/TEAM plan should have 90 days max snooze duration
    organizationRepository.findOne.resolves({ apiServiceLevel: ApiServiceLevelEnum.BUSINESS } as any);
    const businessResponse: SubscriberSessionResponseDto = await session.execute(command);
    expect(businessResponse.maxSnoozeDurationHours).to.equal(90 * 24);

    // ENTERPRISE plan should have 90 days max snooze duration
    organizationRepository.findOne.resolves({ apiServiceLevel: ApiServiceLevelEnum.ENTERPRISE } as any);
    const enterpriseResponse: SubscriberSessionResponseDto = await session.execute(command);
    expect(enterpriseResponse.maxSnoozeDurationHours).to.equal(90 * 24);
  });
});

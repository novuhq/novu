import { BadRequestException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import {
  AnalyticsService,
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  GetSubscriberSchedule,
  GetSubscriberScheduleCommand,
  LogDecorator,
  PinoLogger,
  SelectIntegration,
  SelectIntegrationCommand,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  ContextRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  IntegrationRepository,
  MessageRepository,
  SubscriberEntity,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  ContextPayload,
  CustomDataType,
  EnvironmentTypeEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  InAppProviderIdEnum,
  PreferenceLevelEnum,
  Schedule,
} from '@novu/shared';
import { AuthService } from '../../../auth/services/auth.service';
import { KeylessAbuseGuardService } from '../../../keyless/keyless-abuse-guard.service';
import { GetOrganizationSettingsCommand } from '../../../organization/usecases/get-organization-settings/get-organization-settings.command';
import { GetOrganizationSettings } from '../../../organization/usecases/get-organization-settings/get-organization-settings.usecase';
import { ScheduleDto } from '../../../shared/dtos/schedule';
import { isHmacValidForAnyKey } from '../../../shared/helpers/is-valid-hmac';
import { SubscriberDto, SubscriberSessionRequestDto } from '../../dtos/subscriber-session-request.dto';
import { SubscriberSessionResponseDto } from '../../dtos/subscriber-session-response.dto';
import { AnalyticsEventsEnum, KEYLESS_ENVIRONMENT_PREFIX, KEYLESS_SUBSCRIBER_ID } from '../../utils';
import { validateContextHmacEncryption, validateHmacEncryption } from '../../utils/encryption';
import { isKeylessEnvironmentExpired } from '../../utils/keyless-expiry';
import {
  CreateKeylessEnvironmentCommand,
  KeylessEnvironmentPurposeEnum,
} from '../create-keyless-environment/create-keyless-environment.command';
import { CreateKeylessEnvironment } from '../create-keyless-environment/create-keyless-environment.usecase';
import { NotificationsCountCommand } from '../notifications-count/notifications-count.command';
import { NotificationsCount } from '../notifications-count/notifications-count.usecase';
import { UpdatePreferencesCommand } from '../update-preferences/update-preferences.command';
import { UpdatePreferences } from '../update-preferences/update-preferences.usecase';
import { SessionCommand } from './session.command';

const ALLOWED_ORIGINS_REGEX = new RegExp(process.env.FRONT_BASE_URL || '');
const MAX_NOTIFICATIONS_COUNT = 100;

@Injectable()
export class Session {
  private readonly KEYLESS_ENVIRONMENT_PREFIX = KEYLESS_ENVIRONMENT_PREFIX;

  constructor(
    private environmentRepository: EnvironmentRepository,
    private createSubscriber: CreateOrUpdateSubscriberUseCase,
    private authService: AuthService,
    private selectIntegration: SelectIntegration,
    private analyticsService: AnalyticsService,
    private notificationsCount: NotificationsCount,
    private integrationRepository: IntegrationRepository,
    private organizationRepository: CommunityOrganizationRepository,
    private contextRepository: ContextRepository,
    private messageRepository: MessageRepository,
    private getOrganizationSettingsUsecase: GetOrganizationSettings,
    private logger: PinoLogger,
    private getSubscriberSchedule: GetSubscriberSchedule,
    private updatePreferencesUsecase: UpdatePreferences,
    private keylessAbuseGuard: KeylessAbuseGuardService,
    private createKeylessEnvironment: CreateKeylessEnvironment
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @LogDecorator()
  async execute(command: SessionCommand): Promise<SubscriberSessionResponseDto> {
    this.validateRequestData(command.requestData);

    const subscriber = this.buildPlatformSubscriber(command.requestData);
    const applicationIdentifier = await this.getApplicationIdentifier(command.requestData, command.clientIp);

    const environment = await this.environmentRepository.findEnvironmentByIdentifier(applicationIdentifier);
    if (!environment) {
      throw new BadRequestException('Please provide a valid application identifier');
    }

    const selection = await this.selectIntegration.execute(
      SelectIntegrationCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        channelType: ChannelTypeEnum.IN_APP,
        providerId: InAppProviderIdEnum.Novu,
        filterData: {},
      })
    );

    if (!selection) {
      throw new NotFoundException('The active in-app integration could not be found');
    }
    const { integration: inAppIntegration } = selection;

    const environmentApiKeys = environment.apiKeys.map((apiKey) => apiKey.key);

    if (inAppIntegration.credentials.hmac) {
      validateHmacEncryption({
        apiKeys: environmentApiKeys,
        subscriberId: subscriber.subscriberId,
        subscriberHash: command.requestData.subscriberHash,
      });

      if (command.requestData.context) {
        validateContextHmacEncryption({
          apiKeys: environmentApiKeys,
          context: command.requestData.context,
          contextHash: command.requestData.contextHash,
        });
      }
    }

    const contextKeys = await this.resolveContexts(
      environment._id,
      environment._organizationId,
      command.requestData.context
    );

    const subscriberEntity = await this.createSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        subscriberId: subscriber.subscriberId,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        phone: subscriber.phone,
        email: subscriber.email,
        avatar: subscriber.avatar,
        locale: subscriber.locale,
        data: subscriber.data as CustomDataType,
        timezone: subscriber.timezone,
        allowUpdate: isHmacValidForAnyKey(
          environmentApiKeys,
          subscriber.subscriberId,
          command.requestData.subscriberHash
        ),
      })
    );

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.SESSION_INITIALIZED, '', {
      _organization: environment._organizationId,
      environmentName: environment.name,
      _subscriber: subscriberEntity._id,
      origin: command.requestData.applicationIdentifier ? command.origin : 'keyless',
      context: contextKeys,
    });

    const { data } = await this.notificationsCount.execute(
      NotificationsCountCommand.create({
        organizationId: environment._organizationId,
        environmentId: environment._id,
        subscriberId: subscriber.subscriberId,
        filters: [{ read: false, snoozed: false }],
        subscriber: subscriberEntity,
        contextKeys,
      })
    );
    const [{ count: totalUnreadCount }] = data;

    // get severity-based unread counts
    const severityCounts = await this.messageRepository.getCountBySeverity(
      environment._id,
      subscriberEntity._id,
      ChannelTypeEnum.IN_APP,
      { read: false, snoozed: false },
      { limit: MAX_NOTIFICATIONS_COUNT },
      contextKeys
    );

    const unreadCount: SubscriberSessionResponseDto['unreadCount'] = {
      total: totalUnreadCount,
      severity: {
        high: 0,
        medium: 0,
        low: 0,
        none: 0,
      },
    };

    for (const { severity, count } of severityCounts) {
      if (severity in unreadCount.severity) {
        unreadCount.severity[severity] = count;
      }
    }

    const [token, organization] = await Promise.all([
      this.authService.getSubscriberWidgetToken(subscriberEntity, contextKeys),
      this.organizationRepository.findById(environment._organizationId),
    ]);

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const schedulePromise = this.createDefaultSchedule({
      environment,
      defaultSchedule: command.requestData.defaultSchedule,
      subscriber: subscriberEntity,
      contextKeys,
    });

    const [{ removeNovuBranding }, maxSnoozeDurationHours, schedule] = await Promise.all([
      this.getOrganizationSettingsUsecase.execute(
        GetOrganizationSettingsCommand.create({
          organizationId: environment._organizationId,
          organization,
        })
      ),
      this.getMaxSnoozeDurationHours(organization.apiServiceLevel),
      schedulePromise,
    ]);

    /**
     * We want to prevent the playground inbox demo from marking the integration as connected
     * And only treat the real customer domain or local environment as valid origins
     */
    const isOriginFromNovu = ALLOWED_ORIGINS_REGEX.test(command.origin ?? '');
    if (!isOriginFromNovu && !inAppIntegration.connected) {
      this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.INBOX_CONNECTED, '', {
        _organization: environment._organizationId,
        environmentName: environment.name,
      });

      await this.integrationRepository.updateOne(
        {
          _id: inAppIntegration._id,
          _organizationId: environment._organizationId,
          _environmentId: environment._id,
        },
        {
          $set: {
            connected: true,
          },
        }
      );
    }

    return {
      applicationIdentifier: environment.identifier,
      token,
      totalUnreadCount,
      unreadCount,
      removeNovuBranding,
      maxSnoozeDurationHours,
      isDevelopmentMode: this.isInboxDevelopmentMode(environment),
      schedule,
      contextKeys,
    };
  }

  private async createDefaultSchedule({
    environment,
    defaultSchedule,
    subscriber,
    contextKeys,
  }: {
    environment: EnvironmentEntity;
    defaultSchedule?: ScheduleDto;
    subscriber: SubscriberEntity;
    contextKeys: string[];
  }): Promise<Schedule | undefined> {
    const schedule = await this.getSubscriberSchedule.execute(
      GetSubscriberScheduleCommand.create({
        organizationId: environment._organizationId,
        environmentId: environment._id,
        _subscriberId: subscriber._id,
        contextKeys,
      })
    );

    if (schedule || !defaultSchedule) {
      return schedule;
    }

    const updatedGlobalPreference = await this.updatePreferencesUsecase.execute(
      UpdatePreferencesCommand.create({
        organizationId: environment._organizationId,
        environmentId: environment._id,
        subscriber,
        subscriberId: subscriber.subscriberId,
        contextKeys,
        level: PreferenceLevelEnum.GLOBAL,
        includeInactiveChannels: false,
        schedule: defaultSchedule,
      })
    );

    return updatedGlobalPreference.schedule;
  }

  /**
   * Live (production-type) environments must not show the Inbox "Development mode" footer,
   * regardless of display name. Legacy orgs may lack `type`; fall back to the old name check.
   */
  private isInboxDevelopmentMode(environment: EnvironmentEntity): boolean {
    if (environment.identifier?.startsWith(this.KEYLESS_ENVIRONMENT_PREFIX)) {
      return true;
    }

    if (environment.type === EnvironmentTypeEnum.PROD) {
      return false;
    }

    if (environment.type === EnvironmentTypeEnum.DEV) {
      return true;
    }

    return environment.name.toLowerCase() !== 'production';
  }

  private validateRequestData(requestData: SubscriberSessionRequestDto): void {
    if (!requestData.applicationIdentifier && this.extractSubscriberInfo(requestData, true)?.subscriberId) {
      throw new UnprocessableEntityException(
        'A valid application identifier is required when providing subscriber information'
      );
    }
  }

  private buildPlatformSubscriber(requestData: SubscriberSessionRequestDto): SubscriberDto {
    if (!requestData.applicationIdentifier || this.isKeylessApplication(requestData.applicationIdentifier)) {
      return { subscriberId: KEYLESS_SUBSCRIBER_ID };
    }

    return this.extractSubscriberInfo(requestData);
  }

  private isKeylessApplication(applicationIdentifier: string): boolean {
    return applicationIdentifier.startsWith(this.KEYLESS_ENVIRONMENT_PREFIX);
  }

  private extractSubscriberInfo(requestData: SubscriberSessionRequestDto): SubscriberDto;
  private extractSubscriberInfo(requestData: SubscriberSessionRequestDto, safe: true): SubscriberDto | null;
  private extractSubscriberInfo(requestData: SubscriberSessionRequestDto, safe: boolean = false): SubscriberDto | null {
    const subscriber: SubscriberDto | null = this.normalizeSubscriber(requestData.subscriber);

    if (subscriber?.subscriberId) {
      return subscriber;
    }

    // TODO: Backward compatibility support - remove in future versions (see NV-5801)
    if (requestData.subscriberId) {
      return { subscriberId: requestData.subscriberId };
    }

    if (safe) {
      return null;
    }

    throw new UnprocessableEntityException('Subscriber ID is required');
  }

  private normalizeSubscriber(subscriber: string | SubscriberDto | null | undefined): SubscriberDto | null {
    if (!subscriber) {
      return null;
    }

    if (typeof subscriber === 'string') {
      return { subscriberId: subscriber };
    }

    return subscriber;
  }

  private async getApplicationIdentifier(requestData: SubscriberSessionRequestDto, clientIp?: string): Promise<string> {
    const { applicationIdentifier } = requestData;
    const isKeylessInitialize = !applicationIdentifier;
    const isKeyless = applicationIdentifier?.includes(this.KEYLESS_ENVIRONMENT_PREFIX);
    const isKeylessExpired = isKeyless ? isKeylessEnvironmentExpired(applicationIdentifier) : false;

    if (isKeylessInitialize || isKeylessExpired) {
      await this.keylessAbuseGuard.assertEnvCreationAllowed(clientIp);
      const { environment } = await this.createKeylessEnvironment.execute(
        CreateKeylessEnvironmentCommand.create({ purpose: KeylessEnvironmentPurposeEnum.INBOX_DEMO })
      );

      return environment.identifier;
    }

    if (!applicationIdentifier) {
      throw new BadRequestException('Application identifier is required');
    }

    return applicationIdentifier;
  }

  private async resolveContexts(
    environmentId: string,
    organizationId: string,
    context?: ContextPayload
  ): Promise<string[]> {
    if (!context) {
      return [];
    }

    const contexts = await this.contextRepository.findOrCreateContextsFromPayload(
      environmentId,
      organizationId,
      context
    );

    return contexts.map((context) => context.key);
  }

  private async getMaxSnoozeDurationHours(apiServiceLevel: ApiServiceLevelEnum) {
    if (process.env.NOVU_ENTERPRISE !== 'true') {
      return 0;
    }

    const tierLimitMs = getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_SNOOZE_DURATION,
      apiServiceLevel || ApiServiceLevelEnum.FREE,
      true
    );

    return tierLimitMs / 1000 / 60 / 60;
  }
}

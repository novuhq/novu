import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import {
  AnalyticsService,
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  LogDecorator,
  SelectIntegration,
  SelectIntegrationCommand,
} from '@novu/application-generic';
import {
  CommunityOrganizationRepository,
  EnvironmentEntity,
  EnvironmentRepository,
  IntegrationRepository,
} from '@novu/dal';
import {
  ApiServiceLevelEnum,
  ChannelTypeEnum,
  FeatureNameEnum,
  getFeatureForTierAsNumber,
  InAppProviderIdEnum,
  CustomDataType,
} from '@novu/shared';
import { AuthService } from '../../../auth/services/auth.service';
import { SubscriberSessionResponseDto } from '../../dtos/subscriber-session-response.dto';
import { AnalyticsEventsEnum } from '../../utils';
import { validateHmacEncryption } from '../../utils/encryption';
import { NotificationsCountCommand } from '../notifications-count/notifications-count.command';
import { NotificationsCount } from '../notifications-count/notifications-count.usecase';
import { SessionCommand } from './session.command';
import { isHmacValid } from '../../../shared/helpers/is-valid-hmac';

const ALLOWED_ORIGINS_REGEX = new RegExp(process.env.FRONT_BASE_URL || '');

@Injectable()
export class Session {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private createSubscriber: CreateOrUpdateSubscriberUseCase,
    private authService: AuthService,
    private selectIntegration: SelectIntegration,
    private analyticsService: AnalyticsService,
    private notificationsCount: NotificationsCount,
    private integrationRepository: IntegrationRepository,
    private organizationRepository: CommunityOrganizationRepository
  ) {}

  @LogDecorator()
  async execute(command: SessionCommand): Promise<SubscriberSessionResponseDto> {
    const environment = await this.environmentRepository.findEnvironmentByIdentifier(command.applicationIdentifier);

    if (!environment) {
      throw new BadRequestException('Please provide a valid application identifier');
    }

    const inAppIntegration = await this.selectIntegration.execute(
      SelectIntegrationCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        channelType: ChannelTypeEnum.IN_APP,
        providerId: InAppProviderIdEnum.Novu,
        filterData: {},
      })
    );

    if (!inAppIntegration) {
      throw new NotFoundException('The active in-app integration could not be found');
    }

    if (inAppIntegration.credentials.hmac) {
      validateHmacEncryption({
        apiKey: environment.apiKeys[0].key,
        subscriberId: command.subscriber.subscriberId,
        subscriberHash: command.subscriberHash,
      });
    }

    const subscriber = await this.createSubscriber.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        subscriberId: command.subscriber.subscriberId,
        firstName: command.subscriber.firstName,
        lastName: command.subscriber.lastName,
        phone: command.subscriber.phone,
        email: command.subscriber.email,
        avatar: command.subscriber.avatar,
        data: command.subscriber.data as CustomDataType,
        timezone: command.subscriber.timezone,
        allowUpdate: isHmacValid(environment.apiKeys[0].key, command.subscriber.subscriberId, command.subscriberHash),
      })
    );

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.SESSION_INITIALIZED, '', {
      _organization: environment._organizationId,
      environmentName: environment.name,
      _subscriber: subscriber._id,
      origin: command.origin,
    });

    const { data } = await this.notificationsCount.execute(
      NotificationsCountCommand.create({
        organizationId: environment._organizationId,
        environmentId: environment._id,
        subscriberId: command.subscriber.subscriberId,
        filters: [{ read: false, snoozed: false }],
      })
    );
    const [{ count: totalUnreadCount }] = data;

    const token = await this.authService.getSubscriberWidgetToken(subscriber);

    const removeNovuBranding = inAppIntegration.removeNovuBranding || false;
    const maxSnoozeDurationHours = await this.getMaxSnoozeDurationHours(environment);

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
      token,
      totalUnreadCount,
      removeNovuBranding,
      maxSnoozeDurationHours,
      isDevelopmentMode: environment.name.toLowerCase() !== 'production',
    };
  }

  private async getMaxSnoozeDurationHours(environment: EnvironmentEntity) {
    const organization = await this.organizationRepository.findOne({
      _id: environment._organizationId,
    });

    const tierLimitMs = getFeatureForTierAsNumber(
      FeatureNameEnum.PLATFORM_MAX_SNOOZE_DURATION,
      organization?.apiServiceLevel || ApiServiceLevelEnum.FREE,
      true
    );

    return tierLimitMs / 1000 / 60 / 60;
  }
}

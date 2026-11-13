import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AnalyticsService,
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  InstrumentUsecase,
  LogDecorator,
  SelectIntegration,
  SelectIntegrationCommand,
} from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import { AuthService } from '../../../auth/services/auth.service';
import { isHmacValidForAnyKey } from '../../../shared/helpers/is-valid-hmac';
import {
  LEGACY_WIDGET_SESSION_CLIENT,
  parseSessionClient,
  SubscriberSessionAuthMethodEnum,
  SubscriberSessionAuthStatsService,
} from '../../../shared/services/subscriber-session-auth-stats.service';

import { SessionInitializeResponseDto } from '../../dtos/session-initialize-response.dto';
import { InitializeSessionCommand } from './initialize-session.command';

@Injectable()
export class InitializeSession {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private createOrUpdateSubscriberUsecase: CreateOrUpdateSubscriberUseCase,
    private authService: AuthService,
    private selectIntegration: SelectIntegration,
    private analyticsService: AnalyticsService,
    private subscriberSessionAuthStatsService: SubscriberSessionAuthStatsService
  ) {}

  @LogDecorator()
  @InstrumentUsecase()
  async execute(command: InitializeSessionCommand): Promise<SessionInitializeResponseDto> {
    const environment = await this.environmentRepository.findEnvironmentByIdentifier(command.applicationIdentifier);

    if (!environment) {
      throw new BadRequestException('Please provide a valid app identifier');
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
      throw new NotFoundException('In app integration could not be found');
    }
    const { integration: inAppIntegration } = selection;

    const hmacValid = isHmacValidForAnyKey(
      environment.apiKeys.map((apiKey) => apiKey.key),
      command.subscriberId,
      command.hmacHash
    );

    if (inAppIntegration.credentials.hmac) {
      validateNotificationCenterEncryption(environment, command);
    }

    const subscriber = await this.createOrUpdateSubscriberUsecase.execute(
      CreateOrUpdateSubscriberCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        subscriberId: command.subscriberId,
        firstName: command.firstName,
        lastName: command.lastName,
        email: command.email,
        phone: command.phone,
        allowUpdate: hmacValid,
      })
    );

    this.analyticsService.mixpanelTrack('Initialize Widget Session - [Notification Center]', '', {
      _organization: environment._organizationId,
      environmentName: environment.name,
      _subscriber: subscriber._id,
    });

    const token = await this.authService.getSubscriberWidgetToken(subscriber, []);

    void this.subscriberSessionAuthStatsService.record({
      environmentId: environment._id,
      authMethod: hmacValid ? SubscriberSessionAuthMethodEnum.HMAC : SubscriberSessionAuthMethodEnum.NONE,
      client: parseSessionClient(command.clientVersion) ?? LEGACY_WIDGET_SESSION_CLIENT,
    });

    return {
      token,
      profile: {
        _id: subscriber._id,
        firstName: subscriber.firstName,
        lastName: subscriber.lastName,
        phone: subscriber.phone,
      },
    };
  }
}

function validateNotificationCenterEncryption(environment, command: InitializeSessionCommand) {
  const apiKeys = environment.apiKeys.map((apiKey) => apiKey.key);

  if (!isHmacValidForAnyKey(apiKeys, command.subscriberId, command.hmacHash)) {
    throw new BadRequestException('Please provide a valid HMAC hash');
  }
}

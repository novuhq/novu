import { Injectable, NotFoundException } from '@nestjs/common';
import { EnvironmentRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import {
  AnalyticsService,
  LogDecorator,
  CreateSubscriber,
  CreateSubscriberCommand,
  SelectIntegrationCommand,
  SelectIntegration,
  AuthService,
} from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { SessionCommand } from './session.command';
import { SubscriberSessionResponseDto } from '../../dtos/subscriber-session-response.dto';
import { AnalyticsEventsEnum } from '../../utils';
import { validateHmacEncryption } from '../../utils/encryption';
import { NotificationsCount } from '../notifications-count/notifications-count.usecase';
import { NotificationsCountCommand } from '../notifications-count/notifications-count.command';

@Injectable()
export class Session {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private createSubscriber: CreateSubscriber,
    private authService: AuthService,
    private selectIntegration: SelectIntegration,
    private analyticsService: AnalyticsService,
    private notificationsCount: NotificationsCount
  ) {}

  @LogDecorator()
  async execute(command: SessionCommand): Promise<SubscriberSessionResponseDto> {
    const environment = await this.environmentRepository.findEnvironmentByIdentifier(command.applicationIdentifier);

    if (!environment) {
      throw new ApiException('Please provide a valid application identifier');
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
        subscriberId: command.subscriberId,
        subscriberHash: command.subscriberHash,
      });
    }

    const subscriber = await this.createSubscriber.execute(
      CreateSubscriberCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        subscriberId: command.subscriberId,
      })
    );

    this.analyticsService.mixpanelTrack(AnalyticsEventsEnum.SESSION_INITIALIZED, '', {
      _organization: environment._organizationId,
      environmentName: environment.name,
      _subscriber: subscriber._id,
    });

    const { data } = await this.notificationsCount.execute(
      NotificationsCountCommand.create({
        organizationId: environment._organizationId,
        environmentId: environment._id,
        subscriberId: command.subscriberId,
        filters: [{ read: false }],
      })
    );
    const [{ count: totalUnreadCount }] = data;

    const token = await this.authService.getSubscriberWidgetToken(subscriber);

    const removeNovuBranding = inAppIntegration.removeNovuBranding || false;

    return {
      token,
      totalUnreadCount,
      removeNovuBranding,
    };
  }
}

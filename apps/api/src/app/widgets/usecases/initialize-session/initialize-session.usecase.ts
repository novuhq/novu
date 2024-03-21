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
  createHash,
  decryptApiKey,
} from '@novu/application-generic';

import { ApiException } from '../../../shared/exceptions/api.exception';
import { InitializeSessionCommand } from './initialize-session.command';

import { SessionInitializeResponseDto } from '../../dtos/session-initialize-response.dto';

@Injectable()
export class InitializeSession {
  constructor(
    private environmentRepository: EnvironmentRepository,
    private createSubscriber: CreateSubscriber,
    private authService: AuthService,
    private selectIntegration: SelectIntegration,
    private analyticsService: AnalyticsService
  ) {}

  @LogDecorator()
  async execute(command: InitializeSessionCommand): Promise<SessionInitializeResponseDto> {
    const environment = await this.environmentRepository.findEnvironmentByIdentifier(command.applicationIdentifier);

    if (!environment) {
      throw new ApiException('Please provide a valid app identifier');
    }

    const inAppIntegration = await this.selectIntegration.execute(
      SelectIntegrationCommand.create({
        environmentId: environment._id,
        organizationId: environment._organizationId,
        userId: command.subscriberId,
        channelType: ChannelTypeEnum.IN_APP,
        providerId: InAppProviderIdEnum.Novu,
        filterData: {},
      })
    );

    if (!inAppIntegration) {
      throw new NotFoundException('In app integration could not be found');
    }

    if (inAppIntegration.credentials.hmac) {
      validateNotificationCenterEncryption(environment, command);
    }

    const commandos = CreateSubscriberCommand.create({
      environmentId: environment._id,
      organizationId: environment._organizationId,
      subscriberId: command.subscriberId,
      firstName: command.firstName,
      lastName: command.lastName,
      email: command.email,
      phone: command.phone,
    });
    const subscriber = await this.createSubscriber.execute(commandos);

    this.analyticsService.mixpanelTrack('Initialize Widget Session - [Notification Center]', '', {
      _organization: environment._organizationId,
      environmentName: environment.name,
      _subscriber: subscriber._id,
    });

    return {
      token: await this.authService.getSubscriberWidgetToken(subscriber),
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
  const key = decryptApiKey(environment.apiKeys[0].key);
  const hmacHash = createHash(key, command.subscriberId);
  if (hmacHash !== command.hmacHash) {
    throw new ApiException('Please provide a valid HMAC hash');
  }
}

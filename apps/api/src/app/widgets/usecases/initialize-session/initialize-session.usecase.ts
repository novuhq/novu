import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CreateOrUpdateSubscriberCommand,
  CreateOrUpdateSubscriberUseCase,
  InstrumentUsecase,
  LogDecorator,
  SelectIntegration,
  SelectIntegrationCommand,
} from '@novu/application-generic';
import { EnvironmentRepository } from '@novu/dal';
import { ChannelTypeEnum, InAppProviderIdEnum } from '@novu/shared';
import { ApiKeyRevocationService } from '../../../auth/api-key-revocation/api-key-revocation.service';
import { AuthService } from '../../../auth/services/auth.service';
import { isHmacValidForAnyKey } from '../../../shared/helpers/is-valid-hmac';
import {
  SubscriberSessionAuthStatsService,
  SubscriberSessionSourceEnum,
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
    private subscriberSessionAuthStatsService: SubscriberSessionAuthStatsService,
    private apiKeyRevocationService: ApiKeyRevocationService
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

    const signingKeys = await this.apiKeyRevocationService.getSigningKeys({
      organizationId: environment._organizationId,
      environmentId: environment._id,
      apiKeys: environment.apiKeys,
    });
    const hmacValid = isHmacValidForAnyKey(signingKeys, command.subscriberId, command.hmacHash);

    if (inAppIntegration.credentials.hmac && !hmacValid) {
      throw new BadRequestException('Please provide a valid HMAC hash');
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

    const token = await this.authService.getSubscriberWidgetToken(subscriber, []);

    void this.subscriberSessionAuthStatsService.record({
      environmentId: environment._id,
      hmacValid,
      clientVersion: command.clientVersion,
      source: SubscriberSessionSourceEnum.LEGACY_WIDGET,
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

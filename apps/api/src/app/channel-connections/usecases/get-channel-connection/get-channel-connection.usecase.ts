import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { GetChannelConnectionResponseDto } from '../../dtos/get-channel-connection-response.dto';
import { GetChannelConnectionCommand } from './get-channel-connection.command';

@Injectable()
export class GetChannelConnection {
  constructor(
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetChannelConnectionCommand): Promise<GetChannelConnectionResponseDto> {
    const channelConnection = await this.channelConnectionRepository.findOne({
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
      resource: command.resource,
      _integrationId: command.integrationIdentifier,
    });

    if (!channelConnection) {
      throw new NotFoundException(
        `Channel connection with resource '${command.resource}' and integration '${command.integrationIdentifier}' not found`
      );
    }

    const integration = await this.integrationRepository.findOne({
      _id: channelConnection._integrationId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    return this.mapChannelConnectionToDto(channelConnection, integration);
  }

  private mapChannelConnectionToDto(
    channelConnection: ChannelConnectionEntity,
    integration: IntegrationEntity | null
  ): GetChannelConnectionResponseDto {
    return {
      identifier: channelConnection.identifier,
      channel: integration?.channel ?? null,
      provider: (integration?.providerId as ProvidersIdEnum) ?? null,
      integrationIdentifier: integration?.identifier ?? null,
      workspace: channelConnection.workspace,
      auth: channelConnection.auth,
      createdAt: channelConnection.createdAt,
      updatedAt: channelConnection.updatedAt,
    };
  }
}

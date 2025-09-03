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
import { UpdateChannelConnectionCommand } from './update-channel-connection.command';

@Injectable()
export class UpdateChannelConnection {
  constructor(
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdateChannelConnectionCommand): Promise<GetChannelConnectionResponseDto> {
    // Check if the channel connection exists
    const existingChannelConnection = await this.channelConnectionRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!existingChannelConnection) {
      throw new NotFoundException(
        `Channel connection with identifier "${command.identifier}" not found in environment "${command.environmentId}"`
      );
    }

    const updatedChannelConnection = await this.updateChannelConnection(command);

    const integration = await this.integrationRepository.findOne({
      _id: existingChannelConnection._integrationId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    return this.mapChannelConnectionEntityToDto(updatedChannelConnection, integration);
  }

  private async updateChannelConnection(command: UpdateChannelConnectionCommand): Promise<ChannelConnectionEntity> {
    const channelConnection = await this.channelConnectionRepository.findOneAndUpdate(
      {
        identifier: command.identifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      },
      {
        workspace: command.workspace,
        auth: command.auth,
      },
      {
        new: true,
      }
    );

    if (!channelConnection) {
      throw new NotFoundException(`Channel connection with identifier "${command.identifier}" not found`);
    }

    return channelConnection;
  }

  private mapChannelConnectionEntityToDto(
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

import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelConnectionEntity, ChannelConnectionRepository } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { GetChannelConnectionResponseDto } from '../../dtos/get-channel-connection-response.dto';
import { UpdateChannelConnectionCommand } from './update-channel-connection.command';

@Injectable()
export class UpdateChannelConnection {
  constructor(private readonly channelConnectionRepository: ChannelConnectionRepository) {}

  @InstrumentUsecase()
  async execute(command: UpdateChannelConnectionCommand): Promise<GetChannelConnectionResponseDto> {
    const updatedChannelConnection = await this.updateChannelConnection(command);

    return this.mapChannelConnectionEntityToDto(updatedChannelConnection);
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

  private mapChannelConnectionEntityToDto(channelConnection: ChannelConnectionEntity): GetChannelConnectionResponseDto {
    return {
      identifier: channelConnection.identifier,
      channel: channelConnection.channel,
      provider: channelConnection.providerId as ProvidersIdEnum,
      integrationIdentifier: channelConnection.integrationIdentifier,
      workspace: channelConnection.workspace,
      auth: channelConnection.auth,
      createdAt: channelConnection.createdAt,
      updatedAt: channelConnection.updatedAt,
    };
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelEndpointEntity, ChannelEndpointRepository, IntegrationEntity, IntegrationRepository } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { GetChannelEndpointResponseDto } from '../../dtos/get-channel-endpoint-response.dto';
import { UpdateChannelEndpointCommand } from './update-channel-endpoint.command';

@Injectable()
export class UpdateChannelEndpoint {
  constructor(
    private readonly channelEndpointRepository: ChannelEndpointRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdateChannelEndpointCommand): Promise<GetChannelEndpointResponseDto> {
    // Check if the channel endpoint exists
    const existingChannelEndpoint = await this.channelEndpointRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!existingChannelEndpoint) {
      throw new NotFoundException(
        `Channel endpoint with identifier "${command.identifier}" not found in environment "${command.environmentId}"`
      );
    }

    const updatedChannelEndpoint = await this.updateChannelEndpoint(command);

    const integration = await this.integrationRepository.findOne({
      _id: existingChannelEndpoint._integrationId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    return this.mapChannelEndpointEntityToDto(updatedChannelEndpoint, integration);
  }

  private async updateChannelEndpoint(command: UpdateChannelEndpointCommand): Promise<ChannelEndpointEntity> {
    const channelEndpoint = await this.channelEndpointRepository.findOneAndUpdate(
      {
        identifier: command.identifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      },
      {
        endpoint: command.endpoint,
        routing: command.routing,
      },
      {
        new: true,
      }
    );

    if (!channelEndpoint) {
      throw new NotFoundException(`Channel endpoint with identifier "${command.identifier}" not found`);
    }

    return channelEndpoint;
  }

  private mapChannelEndpointEntityToDto(
    channelEndpoint: ChannelEndpointEntity,
    integration: IntegrationEntity | null
  ): GetChannelEndpointResponseDto {
    return {
      identifier: channelEndpoint.identifier,
      channel: integration?.channel ?? null,
      provider: (integration?.providerId as ProvidersIdEnum) ?? null,
      integrationIdentifier: integration?.identifier ?? null,
      endpoint: channelEndpoint.endpoint,
      routing: channelEndpoint.routing,
      createdAt: channelEndpoint.createdAt,
      updatedAt: channelEndpoint.updatedAt,
    };
  }
}

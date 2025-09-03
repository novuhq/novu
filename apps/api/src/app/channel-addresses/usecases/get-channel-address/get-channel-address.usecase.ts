import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import {
  ChannelAddressEntity,
  ChannelAddressRepository,
  ChannelConnectionEntity,
  ChannelConnectionRepository,
  IntegrationEntity,
  IntegrationRepository,
} from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { GetChannelAddressResponseDto } from '../../dtos/get-channel-address-response.dto';
import { GetChannelAddressCommand } from './get-channel-address.command';

@Injectable()
export class GetChannelAddress {
  constructor(
    private readonly channelAddressRepository: ChannelAddressRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: GetChannelAddressCommand): Promise<GetChannelAddressResponseDto> {
    const channelAddress = await this.channelAddressRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!channelAddress) {
      throw new NotFoundException(`Channel address with identifier '${command.identifier}' not found`);
    }

    const integration = await this.integrationRepository.findOne({
      _id: channelAddress._integrationId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    let connection: ChannelConnectionEntity | null = null;
    if (channelAddress._connectionId) {
      connection = await this.channelConnectionRepository.findOne({
        _id: channelAddress._connectionId,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      });
    }

    return this.mapChannelAddressToDto(channelAddress, integration, connection);
  }

  private mapChannelAddressToDto(
    channelAddress: ChannelAddressEntity,
    integration: IntegrationEntity | null,
    connection: ChannelConnectionEntity | null
  ): GetChannelAddressResponseDto {
    return {
      identifier: channelAddress.identifier,
      channel: integration?.channel ?? null,
      provider: (integration?.providerId as ProvidersIdEnum) ?? null,
      integrationIdentifier: integration?.identifier ?? null,
      connectionIdentifier: connection?.identifier ?? null,
      type: channelAddress.type,
      address: channelAddress.address,
      createdAt: channelAddress.createdAt,
      updatedAt: channelAddress.updatedAt,
    };
  }
}

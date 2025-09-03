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
import { validateAddressForType } from '../../../shared/schemas/channel-address.schema';
import { GetChannelAddressResponseDto } from '../../dtos/get-channel-address-response.dto';
import { UpdateChannelAddressCommand } from './update-channel-address.command';

@Injectable()
export class UpdateChannelAddress {
  constructor(
    private readonly channelAddressRepository: ChannelAddressRepository,
    private readonly channelConnectionRepository: ChannelConnectionRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  @InstrumentUsecase()
  async execute(command: UpdateChannelAddressCommand): Promise<GetChannelAddressResponseDto> {
    // Check if the channel address exists
    const existingChannelAddress = await this.channelAddressRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!existingChannelAddress) {
      throw new NotFoundException(
        `Channel address with identifier "${command.identifier}" not found in environment "${command.environmentId}"`
      );
    }

    // Validate that the new address matches the existing type
    validateAddressForType(existingChannelAddress.type, command.address);

    const updatedChannelAddress = await this.updateChannelAddress(command);

    const integration = await this.integrationRepository.findOne({
      _id: existingChannelAddress._integrationId,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    let connection: ChannelConnectionEntity | null = null;
    if (existingChannelAddress._connectionId) {
      connection = await this.channelConnectionRepository.findOne({
        _id: existingChannelAddress._connectionId,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      });
    }

    return this.mapChannelAddressEntityToDto(updatedChannelAddress, integration, connection);
  }

  private async updateChannelAddress(command: UpdateChannelAddressCommand): Promise<ChannelAddressEntity> {
    const channelAddress = await this.channelAddressRepository.findOneAndUpdate(
      {
        identifier: command.identifier,
        _organizationId: command.organizationId,
        _environmentId: command.environmentId,
      },
      {
        address: command.address,
      },
      {
        new: true,
      }
    );

    if (!channelAddress) {
      throw new NotFoundException(`Channel address with identifier "${command.identifier}" not found`);
    }

    return channelAddress;
  }

  private mapChannelAddressEntityToDto(
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

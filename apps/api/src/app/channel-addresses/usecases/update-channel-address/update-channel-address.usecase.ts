import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, validateAddressForType } from '@novu/application-generic';
import { ChannelAddressEntity, ChannelAddressRepository } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { GetChannelAddressResponseDto } from '../../dtos/get-channel-address-response.dto';
import { UpdateChannelAddressCommand } from './update-channel-address.command';

@Injectable()
export class UpdateChannelAddress {
  constructor(private readonly channelAddressRepository: ChannelAddressRepository) {}

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

    return this.mapChannelAddressEntityToDto(updatedChannelAddress);
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

  private mapChannelAddressEntityToDto(channelAddress: ChannelAddressEntity): GetChannelAddressResponseDto {
    return {
      identifier: channelAddress.identifier,
      channel: channelAddress.channel,
      provider: channelAddress.providerId as ProvidersIdEnum,
      integrationIdentifier: channelAddress.integrationIdentifier,
      connectionIdentifier: channelAddress.connectionIdentifier ?? null,
      type: channelAddress.type,
      address: channelAddress.address,
      createdAt: channelAddress.createdAt,
      updatedAt: channelAddress.updatedAt,
    };
  }
}

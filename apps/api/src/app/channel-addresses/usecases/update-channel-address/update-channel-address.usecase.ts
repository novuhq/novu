import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelAddressEntity, ChannelAddressRepository } from '@novu/dal';
import { validateAddressForType } from '../../../shared/schemas/channel-address.schema';
import { mapChannelAddressEntityToDto } from '../../dtos/dto.mapper';
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

    return mapChannelAddressEntityToDto(updatedChannelAddress);
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
}

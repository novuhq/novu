import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelAddressEntity, ChannelAddressRepository } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { mapChannelAddressEntityToDto } from '../../dtos/dto.mapper';
import { GetChannelAddressResponseDto } from '../../dtos/get-channel-address-response.dto';
import { GetChannelAddressCommand } from './get-channel-address.command';

@Injectable()
export class GetChannelAddress {
  constructor(private readonly channelAddressRepository: ChannelAddressRepository) {}

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

    return mapChannelAddressEntityToDto(channelAddress);
  }
}

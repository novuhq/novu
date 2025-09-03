import { Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import { ChannelAddressRepository } from '@novu/dal';
import { DeleteChannelAddressCommand } from './delete-channel-address.command';

@Injectable()
export class DeleteChannelAddress {
  constructor(private readonly channelAddressRepository: ChannelAddressRepository) {}

  @InstrumentUsecase()
  async execute(command: DeleteChannelAddressCommand): Promise<void> {
    const channelAddress = await this.channelAddressRepository.findOne({
      identifier: command.identifier,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });

    if (!channelAddress) {
      throw new NotFoundException(`Channel address with identifier '${command.identifier}' not found`);
    }

    await this.channelAddressRepository.delete({
      _id: channelAddress._id,
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    });
  }
}

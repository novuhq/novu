import { Injectable } from '@nestjs/common';
import { InstrumentUsecase } from '@novu/application-generic';
import type { EnforceEnvOrOrgIds } from '@novu/dal';
import { ChannelAddressDBModel, ChannelAddressEntity, ChannelAddressRepository } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { FilterQuery } from 'mongoose';
import { mapChannelAddressEntityToDto } from '../../dtos/dto.mapper';
import { GetChannelAddressResponseDto } from '../../dtos/get-channel-address-response.dto';
import { GetChannelAddressesCommand } from './get-channel-addresses.command';

@Injectable()
export class GetChannelAddresses {
  constructor(private readonly channelAddressRepository: ChannelAddressRepository) {}

  @InstrumentUsecase()
  async execute(command: GetChannelAddressesCommand): Promise<GetChannelAddressResponseDto[]> {
    const channelAddresses = await this.fetchChannelAddresses(command);

    if (channelAddresses.length === 0) {
      return [];
    }

    return this.mapAndFilterAddresses(channelAddresses);
  }

  private async fetchChannelAddresses(command: GetChannelAddressesCommand): Promise<ChannelAddressEntity[]> {
    const query: FilterQuery<ChannelAddressDBModel> & EnforceEnvOrOrgIds = {
      _organizationId: command.organizationId,
      _environmentId: command.environmentId,
    };

    if (command.resource) {
      query.resource = command.resource;
    }

    if (command.type) {
      query.type = command.type;
    }

    if (command.channel) {
      query.channel = command.channel;
    }

    if (command.provider) {
      query.providerId = command.provider;
    }

    return await this.channelAddressRepository.find(query);
  }

  private mapAndFilterAddresses(channelAddresses: ChannelAddressEntity[]): GetChannelAddressResponseDto[] {
    return channelAddresses.map((addr) => mapChannelAddressEntityToDto(addr));
  }
}

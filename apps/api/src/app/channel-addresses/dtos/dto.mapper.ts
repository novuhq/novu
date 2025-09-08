import { ChannelAddressEntity } from '@novu/dal';
import { ProvidersIdEnum } from '@novu/shared';
import { GetChannelAddressResponseDto } from './get-channel-address-response.dto';

export function mapChannelAddressEntityToDto(channelAddress: ChannelAddressEntity): GetChannelAddressResponseDto {
  return {
    identifier: channelAddress.identifier,
    channel: channelAddress.channel,
    provider: channelAddress.providerId as ProvidersIdEnum,
    integrationIdentifier: channelAddress.integrationIdentifier,
    connectionIdentifier: channelAddress.connectionIdentifier || null,
    type: channelAddress.type,
    address: channelAddress.address,
    createdAt: channelAddress.createdAt,
    updatedAt: channelAddress.updatedAt,
  };
}

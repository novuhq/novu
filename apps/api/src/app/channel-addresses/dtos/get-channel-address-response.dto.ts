import { ApiProperty } from '@nestjs/swagger';
import { getApiPropertyExamples } from '@novu/application-generic';
import {
  ADDRESS_TYPES,
  ChannelAddressByType,
  ChannelAddressType,
  ChannelTypeEnum,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
} from '@novu/shared';

export class GetChannelAddressResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the channel address.',
    type: String,
  })
  identifier: string;

  @ApiProperty({
    description: 'The channel type (email, sms, push, chat, etc.).',
    enum: ChannelTypeEnum,
  })
  channel: ChannelTypeEnum | null;

  @ApiProperty({
    description: 'The provider identifier (e.g., sendgrid, twilio, slack, etc.).',
    enum: Object.values(ProvidersIdEnumConst),
  })
  provider: ProvidersIdEnum | null;

  @ApiProperty({
    description: 'The identifier of the integration to use for this channel address.',
    type: String,
    example: 'slack-prod',
  })
  integrationIdentifier: string | null;

  @ApiProperty({
    description: 'The identifier of the channel connection used for this address.',
    type: String,
    example: 'slack-connection-abc123',
  })
  connectionIdentifier: string | null;

  @ApiProperty({
    description: 'Type of channel address',
    enum: Object.values(ADDRESS_TYPES),
    example: ADDRESS_TYPES.SLACK_CHANNEL,
  })
  type: ChannelAddressType;

  @ApiProperty({
    description: 'Address data specific to the channel type',
    oneOf: getApiPropertyExamples(),
  })
  address: ChannelAddressByType[ChannelAddressType];

  @ApiProperty({
    description: 'The timestamp indicating when the channel address was created, in ISO 8601 format.',
    type: String,
  })
  createdAt: string;

  @ApiProperty({
    description: 'The timestamp indicating when the channel address was last updated, in ISO 8601 format.',
    type: String,
  })
  updatedAt: string;
}

import { ApiProperty } from '@nestjs/swagger';
import { getApiPropertyExamples } from '@novu/application-generic';
import {
  ChannelEndpointByType,
  ChannelEndpointType,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
} from '@novu/shared';

export class GetChannelEndpointResponseDto {
  @ApiProperty({
    description: 'The unique identifier of the channel endpoint.',
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
    description: 'The identifier of the integration to use for this channel endpoint.',
    type: String,
    example: 'slack-prod',
  })
  integrationIdentifier: string | null;

  @ApiProperty({
    description: 'The identifier of the channel connection used for this endpoint.',
    type: String,
    example: 'slack-connection-abc123',
  })
  connectionIdentifier: string | null;

  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: Object.values(ENDPOINT_TYPES),
    example: ENDPOINT_TYPES.SLACK_CHANNEL,
  })
  type: ChannelEndpointType;

  @ApiProperty({
    description: 'Endpoint data specific to the channel type',
    oneOf: getApiPropertyExamples(),
  })
  endpoint: ChannelEndpointByType[ChannelEndpointType];

  @ApiProperty({
    description: 'The timestamp indicating when the channel endpoint was created, in ISO 8601 format.',
    type: String,
  })
  createdAt: string;

  @ApiProperty({
    description: 'The timestamp indicating when the channel endpoint was last updated, in ISO 8601 format.',
    type: String,
  })
  updatedAt: string;
}

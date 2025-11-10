import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  ChannelEndpointType,
  ChannelTypeEnum,
  ENDPOINT_TYPES,
  makeResourceKey,
  ProvidersIdEnum,
  ProvidersIdEnumConst,
  RESOURCE,
  ResourceKey,
} from '@novu/shared';
import {
  PhoneEndpointDto,
  SlackChannelEndpointDto,
  SlackUserEndpointDto,
  WebhookEndpointDto,
} from './endpoint-types.dto';

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
    enum: [...new Set([...Object.values(ProvidersIdEnumConst).flatMap((enumObj) => Object.values(enumObj))])],
    enumName: 'ProvidersIdEnum',
    type: String,
    example: 'slack',
  })
  providerId: ProvidersIdEnum | null;

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
    description: 'The resource of the channel connection',
    type: String,
    example: makeResourceKey(RESOURCE.SUBSCRIBER, 'user123'),
  })
  resource: ResourceKey | null;

  @ApiProperty({
    description: 'The context of the channel connection',
    type: [String],
    example: ['tenant:org-123', 'region:us-east-1'],
  })
  contextKeys: string[];

  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: Object.values(ENDPOINT_TYPES),
    example: ENDPOINT_TYPES.SLACK_CHANNEL,
  })
  type: ChannelEndpointType;

  @ApiProperty({
    description: 'Endpoint data specific to the channel type',
    oneOf: [
      { $ref: getSchemaPath(SlackChannelEndpointDto) },
      { $ref: getSchemaPath(SlackUserEndpointDto) },
      { $ref: getSchemaPath(WebhookEndpointDto) },
      { $ref: getSchemaPath(PhoneEndpointDto) },
    ],
  })
  endpoint: SlackChannelEndpointDto | SlackUserEndpointDto | WebhookEndpointDto | PhoneEndpointDto;

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

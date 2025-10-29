import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { getApiPropertyExamples } from '@novu/application-generic';
import {
  ChannelEndpointByType,
  ChannelEndpointType,
  ENDPOINT_TYPES,
  makeResourceKey,
  RESOURCE,
  ResourceKey,
} from '@novu/shared';
import { IsDefined, IsEnum, IsOptional, IsString } from 'class-validator';
import { IsResourceKey } from '../../shared/validators/resource-key.validator';
import { IsValidChannelEndpoint } from '../validators/channel-endpoint.validator';

export class CreateChannelEndpointRequestDto {
  @ApiPropertyOptional({
    description:
      'The unique identifier for the channel endpoint. If not provided, one will be generated automatically.',
    type: String,
    example: 'slack-channel-user123-abc4',
  })
  @IsOptional()
  @IsString()
  identifier?: string;

  @ApiProperty({
    description: 'The resource of the channel endpoint',
    type: String,
    example: makeResourceKey(RESOURCE.SUBSCRIBER, 'user123'),
  })
  @IsDefined()
  @IsResourceKey()
  resource: ResourceKey;

  @ApiProperty({
    description: 'The identifier of the integration to use for this channel endpoint.',
    type: String,
    example: 'slack-prod',
  })
  @IsString()
  @IsDefined()
  integrationIdentifier: string;

  @ApiPropertyOptional({
    description: 'The identifier of the channel connection to use for this channel endpoint.',
    type: String,
    example: 'slack-connection-abc123',
  })
  @IsOptional()
  @IsString()
  connectionIdentifier?: string;

  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: Object.values(ENDPOINT_TYPES),
    example: ENDPOINT_TYPES.SLACK_CHANNEL,
  })
  @IsDefined()
  @IsEnum(Object.values(ENDPOINT_TYPES))
  type: ChannelEndpointType;

  @ApiProperty({
    description: 'Endpoint data specific to the channel type',
    oneOf: getApiPropertyExamples(),
  })
  @IsDefined()
  @IsValidChannelEndpoint()
  endpoint: ChannelEndpointByType[ChannelEndpointType];
}

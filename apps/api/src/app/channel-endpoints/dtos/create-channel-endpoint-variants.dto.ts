import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload, ENDPOINT_TYPES } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  MsTeamsChannelEndpointDto,
  MsTeamsUserEndpointDto,
  PhoneEndpointDto,
  SlackChannelEndpointDto,
  SlackUserEndpointDto,
  WebhookEndpointDto,
} from './endpoint-types.dto';

class CreateChannelEndpointBaseDto {
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
    description: 'The subscriber ID to which the channel endpoint is linked',
    type: String,
    example: 'subscriber-123',
  })
  @IsDefined()
  @IsString()
  subscriberId: string;

  @ApiContextPayload()
  @IsOptional()
  @IsValidContextPayload({ maxCount: 5 })
  context?: ContextPayload;

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
}

export class CreateSlackChannelEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.SLACK_CHANNEL],
    example: ENDPOINT_TYPES.SLACK_CHANNEL,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.SLACK_CHANNEL])
  type: typeof ENDPOINT_TYPES.SLACK_CHANNEL;

  @ApiProperty({
    description: 'Slack channel endpoint data',
    type: SlackChannelEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => SlackChannelEndpointDto)
  endpoint: SlackChannelEndpointDto;
}

export class CreateSlackUserEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.SLACK_USER],
    example: ENDPOINT_TYPES.SLACK_USER,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.SLACK_USER])
  type: typeof ENDPOINT_TYPES.SLACK_USER;

  @ApiProperty({
    description: 'Slack user endpoint data',
    type: SlackUserEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => SlackUserEndpointDto)
  endpoint: SlackUserEndpointDto;
}

export class CreateWebhookEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.WEBHOOK],
    example: ENDPOINT_TYPES.WEBHOOK,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.WEBHOOK])
  type: typeof ENDPOINT_TYPES.WEBHOOK;

  @ApiProperty({
    description: 'Webhook endpoint data',
    type: WebhookEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => WebhookEndpointDto)
  endpoint: WebhookEndpointDto;
}

export class CreatePhoneEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.PHONE],
    example: ENDPOINT_TYPES.PHONE,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.PHONE])
  type: typeof ENDPOINT_TYPES.PHONE;

  @ApiProperty({
    description: 'Phone endpoint data',
    type: PhoneEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => PhoneEndpointDto)
  endpoint: PhoneEndpointDto;
}

export class CreateMsTeamsChannelEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.MS_TEAMS_CHANNEL],
    example: ENDPOINT_TYPES.MS_TEAMS_CHANNEL,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.MS_TEAMS_CHANNEL])
  type: typeof ENDPOINT_TYPES.MS_TEAMS_CHANNEL;

  @ApiProperty({
    description: 'MS Teams channel endpoint data',
    type: MsTeamsChannelEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => MsTeamsChannelEndpointDto)
  endpoint: MsTeamsChannelEndpointDto;
}

export class CreateMsTeamsUserEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.MS_TEAMS_USER],
    example: ENDPOINT_TYPES.MS_TEAMS_USER,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.MS_TEAMS_USER])
  type: typeof ENDPOINT_TYPES.MS_TEAMS_USER;

  @ApiProperty({
    description: 'MS Teams user endpoint data',
    type: MsTeamsUserEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => MsTeamsUserEndpointDto)
  endpoint: MsTeamsUserEndpointDto;
}

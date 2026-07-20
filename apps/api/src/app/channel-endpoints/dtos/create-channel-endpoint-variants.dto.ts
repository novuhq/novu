import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ApiContextPayload, IsValidContextPayload } from '@novu/application-generic';
import { ContextPayload, ENDPOINT_TYPES } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import {
  LineUserEndpointDto,
  MsTeamsChannelEndpointDto,
  MsTeamsUserEndpointDto,
  OpsgenieIntegrationEndpointDto,
  PagerDutyServiceEndpointDto,
  PhoneEndpointDto,
  SlackChannelEndpointDto,
  SlackUserEndpointDto,
  TelegramChatEndpointDto,
  WebexPersonEndpointDto,
  WebexRoomEndpointDto,
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

  @ApiPropertyOptional({
    description:
      'When true, the subscriber is created if it does not exist yet (existing subscribers are never modified). ' +
      'When false or omitted, an unknown subscriberId returns 404.',
    type: Boolean,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  createSubscriberIfMissing?: boolean;

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

export class CreateTelegramChatEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.TELEGRAM_CHAT],
    example: ENDPOINT_TYPES.TELEGRAM_CHAT,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.TELEGRAM_CHAT])
  type: typeof ENDPOINT_TYPES.TELEGRAM_CHAT;

  @ApiProperty({
    description: 'Telegram chat endpoint data',
    type: TelegramChatEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => TelegramChatEndpointDto)
  endpoint: TelegramChatEndpointDto;
}

export class CreateWebexRoomEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'The identifier of the channel connection to use for this Webex endpoint.',
    type: String,
    example: 'webex-connection-abc123',
  })
  @IsDefined()
  @IsString()
  connectionIdentifier: string;

  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.WEBEX_ROOM],
    example: ENDPOINT_TYPES.WEBEX_ROOM,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.WEBEX_ROOM])
  type: typeof ENDPOINT_TYPES.WEBEX_ROOM;

  @ApiProperty({
    description: 'Webex room endpoint data',
    type: WebexRoomEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => WebexRoomEndpointDto)
  endpoint: WebexRoomEndpointDto;
}

export class CreateWebexPersonEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'The identifier of the channel connection to use for this Webex endpoint.',
    type: String,
    example: 'webex-connection-abc123',
  })
  @IsDefined()
  @IsString()
  connectionIdentifier: string;

  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.WEBEX_PERSON],
    example: ENDPOINT_TYPES.WEBEX_PERSON,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.WEBEX_PERSON])
  type: typeof ENDPOINT_TYPES.WEBEX_PERSON;

  @ApiProperty({
    description: 'Webex person endpoint data. Provide exactly one of personId or personEmail.',
    type: WebexPersonEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => WebexPersonEndpointDto)
  endpoint: WebexPersonEndpointDto;
}

export class CreateLineUserEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.LINE_USER],
    example: ENDPOINT_TYPES.LINE_USER,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.LINE_USER])
  type: typeof ENDPOINT_TYPES.LINE_USER;

  @ApiProperty({
    description: 'LINE user endpoint data',
    type: LineUserEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => LineUserEndpointDto)
  endpoint: LineUserEndpointDto;
}

export class CreatePagerDutyServiceEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.PAGERDUTY_SERVICE],
    example: ENDPOINT_TYPES.PAGERDUTY_SERVICE,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.PAGERDUTY_SERVICE])
  type: typeof ENDPOINT_TYPES.PAGERDUTY_SERVICE;

  @ApiProperty({
    description:
      'PagerDuty service endpoint data. The routing key is persisted encrypted on the linked ChannelConnection; the ChannelEndpoint itself carries a lightweight connection reference.',
    type: PagerDutyServiceEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => PagerDutyServiceEndpointDto)
  endpoint: PagerDutyServiceEndpointDto;
}

export class CreateOpsgenieIntegrationEndpointDto extends CreateChannelEndpointBaseDto {
  @ApiProperty({
    description: 'Type of channel endpoint',
    enum: [ENDPOINT_TYPES.OPSGENIE_INTEGRATION],
    example: ENDPOINT_TYPES.OPSGENIE_INTEGRATION,
  })
  @IsDefined()
  @IsEnum([ENDPOINT_TYPES.OPSGENIE_INTEGRATION])
  type: typeof ENDPOINT_TYPES.OPSGENIE_INTEGRATION;

  @ApiProperty({
    description:
      'Opsgenie integration endpoint data. The API key is persisted encrypted on the linked ChannelConnection; the ChannelEndpoint itself carries a lightweight connection reference.',
    type: OpsgenieIntegrationEndpointDto,
  })
  @IsDefined()
  @ValidateNested()
  @Type(() => OpsgenieIntegrationEndpointDto)
  endpoint: OpsgenieIntegrationEndpointDto;
}

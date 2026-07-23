import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OPSGENIE_API_KEY_PATTERN } from '@novu/shared';
import { IsIn, IsObject, IsOptional, IsString, Matches } from 'class-validator';

export class SlackChannelEndpointDto {
  @ApiProperty({
    description: 'Slack channel ID',
    example: 'C123456789',
    type: String,
  })
  @IsString()
  channelId: string;
}

export class SlackUserEndpointDto {
  @ApiProperty({
    description: 'Slack user ID',
    example: 'U123456789',
    type: String,
  })
  @IsString()
  userId: string;
}

export class WebhookEndpointDto {
  @ApiProperty({
    description: 'Webhook URL',
    example: 'https://example.com/webhook',
    type: String,
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description: 'Optional channel identifier',
    type: String,
  })
  @IsString()
  channel?: string;
}

export class PhoneEndpointDto {
  @ApiProperty({
    description: 'Phone number in E.164 format',
    example: '+1234567890',
    type: String,
  })
  @IsString()
  phoneNumber: string;
}

export class MsTeamsChannelEndpointDto {
  @ApiProperty({
    description: 'MS Teams team ID',
    example: '19:abc123...@thread.tacv2',
    type: String,
  })
  @IsString()
  teamId: string;

  @ApiProperty({
    description: 'MS Teams channel ID',
    example: '19:def456...@thread.tacv2',
    type: String,
  })
  @IsString()
  channelId: string;
}

export class MsTeamsUserEndpointDto {
  @ApiProperty({
    description: 'MS Teams user ID',
    example: '29:1234567890abcdef',
    type: String,
  })
  @IsString()
  userId: string;
}

export class TelegramChatEndpointDto {
  @ApiProperty({
    description: 'Telegram chat ID',
    example: '123456789',
    type: String,
  })
  @IsString()
  chatId: string;
}

export class WebexRoomEndpointDto {
  @ApiProperty({
    description: 'Webex room ID',
    example: 'Y2lzY29zcGFyazovL3VzL1JPT00v...',
    type: String,
  })
  @IsString()
  roomId: string;

  @ApiPropertyOptional({
    description: 'Optional Webex parent message ID for threaded replies',
    example: 'Y2lzY29zcGFyazovL3VzL01FU1NBR0Uv...',
    type: String,
  })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class WebexPersonEndpointDto {
  @ApiPropertyOptional({
    description: 'Webex person ID. Provide exactly one of personId or personEmail.',
    example: 'Y2lzY29zcGFyazovL3VzL1BFT1BMRS8...',
    type: String,
  })
  @IsOptional()
  @IsString()
  personId?: string;

  @ApiPropertyOptional({
    description: 'Webex person email. Provide exactly one of personId or personEmail.',
    example: 'user@example.com',
    type: String,
  })
  @IsOptional()
  @IsString()
  personEmail?: string;
}

export class LineUserEndpointDto {
  @ApiProperty({
    description: 'LINE user ID',
    example: 'U1234567890abcdef',
    type: String,
  })
  @IsString()
  userId: string;
}

export class PagerDutyServiceEndpointDto {
  @ApiProperty({
    description:
      'PagerDuty Events API v2 integration key (32-character alphanumeric string). Stored encrypted on the channel endpoint.',
    example: 'R0UTINGK3YEXAMPLE000000000000000',
    type: String,
    minLength: 32,
    maxLength: 32,
  })
  @IsString()
  @Matches(/^[a-zA-Z0-9]{32}$/, {
    message: 'routingKey must be a 32-character alphanumeric PagerDuty Events API v2 integration key',
  })
  routingKey: string;

  @ApiProperty({
    description: 'PagerDuty account region — determines the events API data-center endpoint.',
    enum: ['us', 'eu'],
    example: 'us',
  })
  @IsIn(['us', 'eu'])
  region: 'us' | 'eu';
}

export class ToolWebhookEndpointDto {
  @ApiProperty({
    description:
      'Destination webhook URL (often a per-subscriber capability URL). Stored encrypted on the channel endpoint.',
    example: 'https://example.com/tools/incoming',
    type: String,
  })
  @IsString()
  url: string;

  @ApiPropertyOptional({
    description:
      'Optional headers (e.g. auth tokens) sent with every request to this webhook. Header values are stored encrypted on the channel endpoint.',
    example: { Authorization: 'Bearer <token>' },
    type: Object,
  })
  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Optional HTTP method override for this webhook. Defaults to the integration-level method.',
    enum: ['POST', 'PUT', 'PATCH'],
    example: 'POST',
  })
  @IsOptional()
  @IsIn(['POST', 'PUT', 'PATCH'])
  method?: 'POST' | 'PUT' | 'PATCH';
}

export class OpsgenieIntegrationEndpointDto {
  @ApiProperty({
    description: 'Opsgenie API integration key (GenieKey) in UUID format. Stored encrypted on the channel endpoint.',
    example: 'abcdefg-a25a-4652-883c-73703b12345',
    type: String,
  })
  @IsString()
  @Matches(OPSGENIE_API_KEY_PATTERN, {
    message: 'apiKey must be a UUID-format Opsgenie API integration key (GenieKey)',
  })
  apiKey: string;

  @ApiProperty({
    description: 'Opsgenie account region that determines the alert API data-center endpoint.',
    enum: ['us', 'eu'],
    example: 'us',
  })
  @IsIn(['us', 'eu'])
  region: 'us' | 'eu';
}

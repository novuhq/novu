import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

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

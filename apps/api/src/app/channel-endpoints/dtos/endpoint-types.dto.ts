import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString } from 'class-validator';

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

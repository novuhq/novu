import { ApiProperty } from '@nestjs/swagger';

export class IssueTelegramSubscriberLinkResponseDto {
  @ApiProperty({
    type: String,
    description: 'Signed, single-use JWT identifying this Telegram subscriber-link session',
  })
  token: string;

  @ApiProperty({
    type: String,
    description: "Absolute Telegram deep-link URL the subscriber opens to send `/start <token>` to the bot",
    example: 'https://t.me/MyBot?start=abc123',
  })
  deepLinkUrl: string;

  @ApiProperty({
    type: String,
    description: 'Username of the bot the deep-link targets',
    example: 'MyBot',
  })
  botUsername: string;

  @ApiProperty({ type: String, description: 'ISO-8601 timestamp at which the token expires' })
  expiresAt: string;
}

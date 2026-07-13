import { ApiProperty } from '@nestjs/swagger';

export class IssueTelegramSubscriberLinkResponseDto {
  @ApiProperty({
    type: String,
    description:
      'Telegram deep-link URL (`t.me/<bot>?start=<code>`) the subscriber opens; Telegram sends `/start <code>` to the bot',
    example: 'https://t.me/MyBot?start=AbCdEfGhIjKlMnOpQrStUvWxYz012345',
  })
  deepLinkUrl: string;

  @ApiProperty({
    type: String,
    description: 'Username of the bot the deep-link targets',
    example: 'MyBot',
  })
  botUsername: string;

  @ApiProperty({ type: String, description: 'ISO-8601 timestamp at which the start code expires' })
  expiresAt: string;
}

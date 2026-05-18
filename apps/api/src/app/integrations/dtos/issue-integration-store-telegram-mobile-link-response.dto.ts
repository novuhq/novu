import { ApiProperty } from '@nestjs/swagger';

export class IssueIntegrationStoreTelegramMobileLinkResponseDto {
  @ApiProperty({
    type: String,
    description: 'Signed, single-use JWT identifying this Telegram mobile-setup session',
  })
  token: string;

  @ApiProperty({
    type: String,
    description: 'Absolute URL the user can open on a mobile device to complete Telegram setup',
  })
  url: string;

  @ApiProperty({ type: String, description: 'ISO-8601 timestamp at which the token expires' })
  expiresAt: string;
}

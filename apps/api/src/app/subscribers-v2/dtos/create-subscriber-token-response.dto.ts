import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriberTokenResponseDto {
  @ApiProperty({
    type: String,
    description: 'Novu-signed login token for the subscriber. Exchange it in the browser for an Inbox session.',
  })
  token: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'When the token expires, in ISO 8601.',
    example: '2025-01-01T00:10:00.000Z',
  })
  expiresAt: string;
}

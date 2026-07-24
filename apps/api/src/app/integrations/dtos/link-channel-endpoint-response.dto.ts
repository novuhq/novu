import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LinkChannelEndpointResponseDto {
  @ApiProperty({
    type: String,
    description: 'URL the subscriber opens to link their chat identity (OAuth URL or deep link)',
    example: 'https://t.me/MyBot?start=AbCdEfGhIjKlMnOpQrStUvWxYz012345',
  })
  url: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    description: 'Provider-specific metadata returned alongside the link URL',
    example: { botUsername: 'MyBot', expiresAt: '2026-06-23T12:00:00.000Z' },
  })
  providerMetadata?: Record<string, unknown>;
}

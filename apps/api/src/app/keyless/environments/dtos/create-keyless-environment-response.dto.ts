import { ApiProperty } from '@nestjs/swagger';

export class CreateKeylessEnvironmentResponseDto {
  @ApiProperty({ description: 'Identifier of the created environment', example: '6710f1c2a1b2c3d4e5f60718' })
  environmentId: string;

  @ApiProperty({ description: 'Secret API key for the environment. Returned only once.', example: 'sk_2f4c...' })
  secretKey: string;

  @ApiProperty({ description: 'Public application identifier, e.g. for the Inbox component', example: 'Xk3m9QpL2aZt' })
  applicationIdentifier: string;

  @ApiProperty({ description: 'Base URL of the Novu API to call with the secret key', example: 'https://api.novu.co' })
  apiUrl: string;

  @ApiProperty({
    description: 'URL a human opens to claim the environment into their Novu account',
    example: 'https://dashboard.novu.co/connect/claim?token=nvct_...',
  })
  claimUrl: string;

  @ApiProperty({
    description: 'When the environment and its claim URL expire (ISO 8601)',
    example: '2026-10-17T20:16:00.000Z',
  })
  expiresAt: string;
}

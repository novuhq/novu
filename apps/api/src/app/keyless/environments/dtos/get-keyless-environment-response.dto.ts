import { ApiProperty } from '@nestjs/swagger';

export class GetKeylessEnvironmentResponseDto {
  @ApiProperty({ description: 'Identifier of the environment', example: '6710f1c2a1b2c3d4e5f60718' })
  environmentId: string;

  @ApiProperty({ description: 'Public application identifier', example: 'Xk3m9QpL2aZt' })
  applicationIdentifier: string;

  @ApiProperty({ description: 'Environment status', enum: ['active'], example: 'active' })
  status: 'active';

  @ApiProperty({ description: 'When the environment expires (ISO 8601)', example: '2026-10-17T20:16:00.000Z' })
  expiresAt: string;

  @ApiProperty({
    description: 'URL a human opens to claim the environment into their Novu account',
    example: 'https://dashboard.novu.co/connect/claim?token=nvct_...',
  })
  claimUrl: string;
}

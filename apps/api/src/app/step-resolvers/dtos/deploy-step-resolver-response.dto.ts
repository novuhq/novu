import { ApiProperty } from '@nestjs/swagger';

export class DeployStepResolverResponseDto {
  @ApiProperty({
    description: 'Readable deterministic release hash',
    example: '7gk2m-9q4vx',
  })
  stepResolverHash: string;

  @ApiProperty({
    description: 'Cloudflare script identifier for this release (sr- prefix)',
    example: 'sr-696a21b632ef1f83460d584d-7gk2m-9q4vx',
  })
  workerId: string;

  @ApiProperty({
    description: 'Number of selected manifest steps',
    example: 10,
  })
  selectedStepsCount: number;

  @ApiProperty({
    description: 'Deployment timestamp in ISO format',
    example: '2026-02-11T12:34:56.789Z',
  })
  deployedAt: string;
}

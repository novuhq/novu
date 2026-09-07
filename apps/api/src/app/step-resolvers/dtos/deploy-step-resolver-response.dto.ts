import { ApiProperty } from '@nestjs/swagger';

export class SkippedStepDto {
  @ApiProperty({
    description: 'Workflow identifier',
    example: 'onboarding',
  })
  workflowId: string;

  @ApiProperty({
    description: 'Step identifier',
    example: 'welcome-email',
  })
  stepId: string;

  @ApiProperty({
    description: 'Reason the step was skipped',
    example: 'Code steps limit reached (1/1 used on Free plan)',
  })
  reason: string;
}

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
    description: 'Number of steps successfully deployed in this release',
    example: 1,
  })
  deployedStepsCount: number;

  @ApiProperty({
    description: 'Steps that were skipped due to plan limits',
    type: [SkippedStepDto],
  })
  skippedSteps: SkippedStepDto[];

  @ApiProperty({
    description: 'Deployment timestamp in ISO format',
    example: '2026-02-11T12:34:56.789Z',
  })
  deployedAt: string;
}

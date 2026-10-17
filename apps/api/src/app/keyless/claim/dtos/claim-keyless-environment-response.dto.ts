import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import type { ClaimKeylessEnvironmentKind } from '../usecases/claim-keyless-environment/claim-keyless-environment.usecase';

export class ClaimKeylessEnvironmentResponseDto {
  @ApiProperty({
    enum: ['agent-environment', 'connect'],
    description: 'Whether an AI agent keyless environment or a keyless connect session was claimed.',
  })
  kind: ClaimKeylessEnvironmentKind;

  @ApiProperty({ description: 'The Development environment the keyless setup was merged into.' })
  environmentId: string;

  @ApiPropertyOptional({ description: 'External identifier of the claimed agent, when one was present.' })
  agentIdentifier?: string;

  @ApiProperty({ type: [String], description: 'Identifiers of the workflows copied into the Development environment.' })
  workflowIdentifiers: string[];

  @ApiProperty({
    type: [String],
    description: 'Identifiers of the workflows that were not copied (already present, or not built in the dashboard).',
  })
  skippedWorkflowIdentifiers: string[];
}

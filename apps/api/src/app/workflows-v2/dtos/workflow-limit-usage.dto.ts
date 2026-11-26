import { ApiProperty } from '@nestjs/swagger';
import type { ResourceLimitSource } from '@novu/shared';

export class WorkflowLimitUsageResponseDto {
  @ApiProperty({ description: 'Workflows in the environment that count toward the limit. Demo workflows do not.' })
  used: number;

  @ApiProperty({ description: 'Most workflows the environment can have.' })
  limit: number;

  @ApiProperty({
    description: '`plan` when upgrading lifts the limit, `system` when only the Novu team can raise it.',
    enum: ['plan', 'system'],
  })
  limitSource: ResourceLimitSource;

  @ApiProperty({ description: 'Whether creating or duplicating a workflow would be rejected.' })
  isLimitReached: boolean;
}

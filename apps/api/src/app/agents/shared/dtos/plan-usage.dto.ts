import { ApiProperty } from '@nestjs/swagger';
import { RESOURCE_LIMIT_SOURCES, type ResourceLimitSource } from '@novu/shared';

/**
 * Usage of a plan-limited Connect resource (agents, active channels) in the
 * current environment, against the organization plan limit. Usage is counted
 * per environment so a resource promoted (synced) to production does not
 * consume a second plan slot.
 */
export class PlanUsageDto {
  @ApiProperty({ description: 'Current usage count for the resource in this environment.' })
  used: number;

  @ApiProperty({ description: 'Amount included in the organization plan.' })
  limit: number;
}

/** Agent plan usage, extended with the hard creation cap. */
export class AgentPlanUsageDto extends PlanUsageDto {
  @ApiProperty({ description: 'Total agents in this environment, including inactive ones.' })
  totalCreated: number;

  @ApiProperty({
    description:
      'Hard cap on total agents the organization can create per environment. For plan-limited tiers this is the ' +
      'plan limit plus a small grace buffer; for unlimited tiers it is the platform system limit.',
  })
  creationLimit: number;

  @ApiProperty({
    description:
      'Which constraint produced the limits. `plan` limits are lifted by upgrading; `system` limits (platform cap ' +
      'or per-organization override) require contacting the Novu team.',
    enum: [...RESOURCE_LIMIT_SOURCES],
  })
  limitSource: ResourceLimitSource;
}

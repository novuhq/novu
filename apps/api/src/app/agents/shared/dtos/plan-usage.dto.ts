import { ApiProperty } from '@nestjs/swagger';
import type { AgentLimitSource } from '@novu/application-generic';

/** Organization-wide usage of a plan-limited Connect resource (agents, active channels). */
export class PlanUsageDto {
  @ApiProperty({ description: 'Current usage count for the resource, organization-wide.' })
  used: number;

  @ApiProperty({ description: 'Amount included in the organization plan.' })
  limit: number;
}

/** Agent plan usage, extended with the hard creation cap. */
export class AgentPlanUsageDto extends PlanUsageDto {
  @ApiProperty({ description: 'Total agents in the organization, including inactive ones.' })
  totalCreated: number;

  @ApiProperty({
    description:
      'Hard cap on total agents the organization can create. For plan-limited tiers this is the plan limit plus ' +
      'a small grace buffer; for unlimited tiers it is the platform system limit.',
  })
  creationLimit: number;

  @ApiProperty({
    description:
      'Which constraint produced the limits. `plan` limits are lifted by upgrading; `system` limits (platform cap ' +
      'or per-organization override) require contacting the Novu team.',
    enum: ['plan', 'system'],
  })
  limitSource: AgentLimitSource;
}

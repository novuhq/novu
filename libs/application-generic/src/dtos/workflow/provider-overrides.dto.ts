import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional } from 'class-validator';

/**
 * Per-provider content overrides for a step, keyed by providerId.
 * Persisted as separate STEP_PROVIDER_CONTROLS documents — not inside step controlValues.
 * Property names match ToolProviderIdEnum values (pagerduty, opsgenie).
 */
export class ProviderOverridesDto {
  @ApiPropertyOptional({
    description:
      'PagerDuty content overrides. Merged over the default step body at send time. Supported keys are documented in the PagerDuty override schema.',
    type: 'object',
    additionalProperties: true,
    example: { severity: 'warning', source: 'novu', summary: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  pagerduty?: Record<string, unknown>;

  @ApiPropertyOptional({
    description:
      'Opsgenie content overrides. Merged over the default step body at send time. Supported keys are documented in the Opsgenie override schema.',
    type: 'object',
    additionalProperties: true,
    example: { priority: 'P2', message: '{{payload.title}}' },
  })
  @IsObject()
  @IsOptional()
  opsgenie?: Record<string, unknown>;
}

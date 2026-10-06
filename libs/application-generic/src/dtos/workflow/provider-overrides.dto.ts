import type { ApiPropertyOptions } from '@nestjs/swagger';
import type { StepProviderOverrides } from '@novu/shared';

/**
 * OpenAPI shape for per-provider content overrides.
 *
 * Modeled as a map keyed by providerId — the same wire form as trigger
 * `overrides.providers` — rather than fixed schema properties. Provider ids are
 * data keys (`slack`, `whatsapp-business`, `pagerduty`, …), not API vocabulary,
 * so they stay as ChatProviderIdEnum / ToolProviderIdEnum string values.
 */
export const PROVIDER_OVERRIDES_API_PROPERTY = {
  description:
    'Per-provider content overrides keyed by providerId. Stored separately from controlValues and merged over the default body at send time. Keys are ChatProviderIdEnum / ToolProviderIdEnum values (e.g. `slack`, `whatsapp-business`, `pagerduty`).',
  example: {
    slack: { text: '{{payload.title}}', blocks: [{ type: 'divider' }] },
    'whatsapp-business': { type: 'text', text: { body: '{{payload.title}}' } },
    pagerduty: { severity: 'warning', source: 'novu', summary: '{{payload.title}}' },
  },
  type: 'object',
  additionalProperties: {
    type: 'object',
    additionalProperties: true,
  },
  nullable: true,
} as const satisfies ApiPropertyOptions;

/** Runtime shape of a step's providerOverrides map. */
export type ProviderOverridesDto = StepProviderOverrides;

/** OpenAPI shape for per-integration content overrides: providerId → integration identifier → override. */
export const INTEGRATION_OVERRIDES_API_PROPERTY = {
  description:
    'Per-integration content overrides keyed by providerId, then by integration identifier. Each entry is merged over the matching providerOverrides entry, only for sends through that integration. Trigger-time overrides still take precedence. Entries whose integration does not exist in the environment are kept but not applied.',
  example: {
    'tool-webhook': {
      'prod-alerts': { alert_type: 'incident' },
      'staging-alerts': { alert_type: 'test' },
    },
  },
  type: 'object',
  additionalProperties: {
    type: 'object',
    additionalProperties: PROVIDER_OVERRIDES_API_PROPERTY.additionalProperties,
  },
  nullable: true,
} as const satisfies ApiPropertyOptions;

import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';
import { ToolProviderIdEnum } from '../../../types';
import { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
import { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';
import type { ToolContentOverrideProviderId } from './tool-provider-primary-content';

export { type MergedToolPreview, mergeToolProviderPreview } from './merge-tool-provider-preview';
export { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
export { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';
export {
  getToolProviderPrimaryContentKey,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  TOOL_PROVIDER_PRIMARY_CONTENT_KEY,
  type ToolContentOverrideProviderId,
} from './tool-provider-primary-content';

export const TOOL_PROVIDER_OVERRIDE_SCHEMAS = {
  [ToolProviderIdEnum.PagerDuty]: pagerdutyOverrideJsonSchema,
  [ToolProviderIdEnum.Opsgenie]: opsgenieOverrideJsonSchema,
} as const;

export function getToolProviderOverrideSchema(providerId: string) {
  if (providerId in TOOL_PROVIDER_OVERRIDE_SCHEMAS) {
    return TOOL_PROVIDER_OVERRIDE_SCHEMAS[providerId as ToolContentOverrideProviderId];
  }

  return undefined;
}

/**
 * Step-issues contract for providerOverrides: top-level keys only, values unchecked.
 * Distinct from the full override schemas (used for docs / client value-shape hints),
 * which may also set nested `additionalProperties: false` — those nested rules are not
 * enforced via this helper so Liquid templates never fail type/enum checks.
 *
 * Property schemas use boolean `true` (always-valid) rather than `{}` so Mongoose
 * minimize cannot strip them when controls.schema is persisted as Mixed.
 */
export function getToolProviderOverrideKeysOnlySchema(providerId: string): JSONSchemaDto | undefined {
  const schema = getToolProviderOverrideSchema(providerId);
  if (!schema) {
    return undefined;
  }

  return {
    type: 'object',
    properties: Object.fromEntries(Object.keys(schema.properties).map((key) => [key, true as const])),
    additionalProperties: false,
  };
}

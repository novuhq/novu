import type { JSONSchemaDto } from '../../../dto/workflows/json-schema-dto';
import { ToolProviderIdEnum } from '../../../types';
import { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
import { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';
import type { ToolContentOverrideProviderId } from './tool-provider-primary-content';

export {
  type AnnotatedPreviewLine,
  buildAnnotatedPreviewLines,
} from './build-annotated-preview-lines';
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
} as const satisfies Partial<Record<ToolContentOverrideProviderId, JSONSchemaDto>>;

/** Top-level override keys for each provider — shared by validation, UI, and send-path reservation. */
export const TOOL_PROVIDER_OVERRIDE_KEYS = {
  [ToolProviderIdEnum.PagerDuty]: Object.keys(pagerdutyOverrideJsonSchema.properties),
  [ToolProviderIdEnum.Opsgenie]: Object.keys(opsgenieOverrideJsonSchema.properties),
} as const satisfies Partial<Record<ToolContentOverrideProviderId, readonly string[]>>;

export function getToolProviderOverrideSchema(providerId: string) {
  if (Object.prototype.hasOwnProperty.call(TOOL_PROVIDER_OVERRIDE_SCHEMAS, providerId)) {
    return TOOL_PROVIDER_OVERRIDE_SCHEMAS[providerId as keyof typeof TOOL_PROVIDER_OVERRIDE_SCHEMAS];
  }

  return undefined;
}

export function getToolProviderOverrideKeys(providerId: string): readonly string[] | undefined {
  if (Object.prototype.hasOwnProperty.call(TOOL_PROVIDER_OVERRIDE_KEYS, providerId)) {
    return TOOL_PROVIDER_OVERRIDE_KEYS[providerId as keyof typeof TOOL_PROVIDER_OVERRIDE_KEYS];
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
  const keys = getToolProviderOverrideKeys(providerId);
  if (!keys) {
    return undefined;
  }

  return {
    type: 'object',
    properties: Object.fromEntries(keys.map((key) => [key, true as const])),
    additionalProperties: false,
  };
}

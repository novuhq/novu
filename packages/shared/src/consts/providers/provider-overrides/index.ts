import {
  getProviderOverrideKeys,
  getProviderOverrideKeysOnlySchema,
  getProviderOverrideSchema,
  getProviderPrimaryContentKey,
  PROVIDER_OVERRIDE_KEYS,
  PROVIDER_OVERRIDE_SCHEMAS,
  PROVIDER_PRIMARY_CONTENT_KEY,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  type ToolContentOverrideProviderId,
} from './provider-override-registry';

export { type AnnotatedPreviewLine, buildAnnotatedPreviewLines } from './build-annotated-preview-lines';
export { LIQUID_TEMPLATE_PATTERN, toLiquidTolerantSchema } from './liquid-tolerant';
export {
  type MergedProviderPreview,
  /** @deprecated Renamed to `MergedProviderPreview`. */
  type MergedToolPreview,
  mergeProviderPreview,
  /** @deprecated Renamed to `mergeProviderPreview`. */
  mergeToolProviderPreview,
} from './merge-provider-preview';
export { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
export { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';
export {
  CHAT_CONTENT_OVERRIDE_PROVIDER_IDS,
  type ChatContentOverrideProviderId,
  CONTENT_OVERRIDE_PROVIDER_IDS,
  type ContentOverrideProviderId,
  getContentOverrideProviderIds,
  getProviderOverrideConfig,
  getProviderOverrideKeys,
  getProviderOverrideKeysOnlySchema,
  getProviderOverrideSchema,
  getProviderPrimaryContentKey,
  type OverrideChannelType,
  PROVIDER_OVERRIDE_CONFIGS,
  PROVIDER_OVERRIDE_KEYS,
  PROVIDER_OVERRIDE_SCHEMAS,
  PROVIDER_PRIMARY_CONTENT_KEY,
  type ProviderOverrideConfig,
  stripReservedOverrideKeys,
  TOOL_CONTENT_OVERRIDE_PROVIDER_IDS,
  type ToolContentOverrideProviderId,
} from './provider-override-registry';
export { type SchemaValidationErrorLike, selectDiscriminatedErrors } from './select-discriminated-errors';
export {
  NON_OVERRIDABLE_SLACK_KEYS,
  SLACK_OVERRIDE_KEYS,
  SLACK_OVERRIDE_SCHEMA_SUBPATH,
  SLACK_PRIMARY_CONTENT_KEY,
} from './slack/keys';

/** @deprecated Renamed to `PROVIDER_OVERRIDE_SCHEMAS` now that chat providers are covered too. */
export const TOOL_PROVIDER_OVERRIDE_SCHEMAS = PROVIDER_OVERRIDE_SCHEMAS;

/** @deprecated Renamed to `PROVIDER_OVERRIDE_KEYS` now that chat providers are covered too. */
export const TOOL_PROVIDER_OVERRIDE_KEYS = PROVIDER_OVERRIDE_KEYS;

/** @deprecated Renamed to `getProviderOverrideSchema`. */
export const getToolProviderOverrideSchema = getProviderOverrideSchema;

/** @deprecated Renamed to `getProviderOverrideKeys`. */
export const getToolProviderOverrideKeys = getProviderOverrideKeys;

/** @deprecated Renamed to `getProviderOverrideKeysOnlySchema`. */
export const getToolProviderOverrideKeysOnlySchema = getProviderOverrideKeysOnlySchema;

/**
 * @deprecated Use `PROVIDER_PRIMARY_CONTENT_KEY`, which also reports `null` for providers whose
 * content is nested. This alias keeps the original `string | undefined` shape.
 */
export const TOOL_PROVIDER_PRIMARY_CONTENT_KEY: Readonly<Partial<Record<ToolContentOverrideProviderId, string>>> =
  Object.fromEntries(
    TOOL_CONTENT_OVERRIDE_PROVIDER_IDS.map((providerId) => [
      providerId,
      PROVIDER_PRIMARY_CONTENT_KEY[providerId],
    ]).filter(([, primaryContentKey]) => primaryContentKey !== null)
  );

/** @deprecated Use `getProviderPrimaryContentKey`, which reports `null` for nested-content providers. */
export function getToolProviderPrimaryContentKey(providerId: string): string | undefined {
  return getProviderPrimaryContentKey(providerId) ?? undefined;
}

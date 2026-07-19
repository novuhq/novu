import { ToolProviderIdEnum } from '../../../types';
import { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
import { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';

export { opsgenieOverrideJsonSchema } from './opsgenie-override.schema';
export { pagerdutyOverrideJsonSchema } from './pagerduty-override.schema';

export const TOOL_CONTENT_OVERRIDE_PROVIDER_IDS = [ToolProviderIdEnum.PagerDuty, ToolProviderIdEnum.Opsgenie] as const;

export type ToolContentOverrideProviderId = (typeof TOOL_CONTENT_OVERRIDE_PROVIDER_IDS)[number];

/** Primary content field that falls back to the tool step default `body`. */
export const TOOL_PROVIDER_PRIMARY_CONTENT_KEY = {
  [ToolProviderIdEnum.PagerDuty]: 'summary',
  [ToolProviderIdEnum.Opsgenie]: 'message',
} as const satisfies Record<ToolContentOverrideProviderId, string>;

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

export function getToolProviderPrimaryContentKey(providerId: ToolContentOverrideProviderId) {
  return TOOL_PROVIDER_PRIMARY_CONTENT_KEY[providerId];
}

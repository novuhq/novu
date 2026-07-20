import { ToolProviderIdEnum } from '../../../types';

export const TOOL_CONTENT_OVERRIDE_PROVIDER_IDS = [ToolProviderIdEnum.PagerDuty, ToolProviderIdEnum.Opsgenie] as const;

export type ToolContentOverrideProviderId = (typeof TOOL_CONTENT_OVERRIDE_PROVIDER_IDS)[number];

/** Primary content field that falls back to the tool step default `body`. */
export const TOOL_PROVIDER_PRIMARY_CONTENT_KEY = {
  [ToolProviderIdEnum.PagerDuty]: 'summary',
  [ToolProviderIdEnum.Opsgenie]: 'message',
} as const satisfies Record<ToolContentOverrideProviderId, string>;

export function getToolProviderPrimaryContentKey(providerId: ToolContentOverrideProviderId) {
  return TOOL_PROVIDER_PRIMARY_CONTENT_KEY[providerId];
}

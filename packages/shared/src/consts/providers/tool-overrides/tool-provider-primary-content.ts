import { ToolProviderIdEnum } from '../../../types';

export const TOOL_CONTENT_OVERRIDE_PROVIDER_IDS = [
  ToolProviderIdEnum.PagerDuty,
  ToolProviderIdEnum.Opsgenie,
  ToolProviderIdEnum.Grafana,
  ToolProviderIdEnum.Webhook,
] as const;

export type ToolContentOverrideProviderId = (typeof TOOL_CONTENT_OVERRIDE_PROVIDER_IDS)[number];

/** Primary content field that falls back to the tool step default `body`. */
export const TOOL_PROVIDER_PRIMARY_CONTENT_KEY: Readonly<Partial<Record<ToolContentOverrideProviderId, string>>> = {
  [ToolProviderIdEnum.PagerDuty]: 'summary',
  [ToolProviderIdEnum.Opsgenie]: 'message',
  [ToolProviderIdEnum.Grafana]: 'title',
};

export function getToolProviderPrimaryContentKey(providerId: ToolContentOverrideProviderId): string | undefined {
  return TOOL_PROVIDER_PRIMARY_CONTENT_KEY[providerId];
}

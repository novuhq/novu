import { ToolProviderIdEnum } from '../../../types';

type ToolRoutingCredentials = {
  routingMode?: string;
};

/**
 * Unconditionally endpoint-routed tool providers (per-subscriber ChannelEndpoint only).
 * Tool webhook is mode-dependent — see {@link isEndpointRoutedToolProvider}.
 */
export const ENDPOINT_ROUTED_TOOL_PROVIDERS = new Set<string>([
  ToolProviderIdEnum.PagerDuty,
  ToolProviderIdEnum.Opsgenie,
  ToolProviderIdEnum.Grafana,
]);

/** True when tool-webhook credentials opt into per-subscriber endpoint routing. */
export function isToolWebhookDynamicRouting(credentials?: ToolRoutingCredentials): boolean {
  return credentials?.routingMode === 'dynamic';
}

/**
 * Whether a tool provider must route via subscriber ChannelEndpoints for this integration.
 * PagerDuty/Opsgenie/Grafana always; tool-webhook only when `routingMode === 'dynamic'`.
 */
export function isEndpointRoutedToolProvider(providerId: string, credentials?: ToolRoutingCredentials): boolean {
  if (ENDPOINT_ROUTED_TOOL_PROVIDERS.has(providerId)) {
    return true;
  }

  if (providerId === ToolProviderIdEnum.Webhook) {
    return isToolWebhookDynamicRouting(credentials);
  }

  return false;
}

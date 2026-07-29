import { describe, expect, it } from 'vitest';
import { ToolProviderIdEnum } from '../../../types';
import {
  ENDPOINT_ROUTED_TOOL_PROVIDERS,
  isEndpointRoutedToolProvider,
  isToolWebhookDynamicRouting,
} from './tool-routing';

describe('tool routing policy', () => {
  it('treats PagerDuty and Opsgenie as always endpoint-routed', () => {
    expect(ENDPOINT_ROUTED_TOOL_PROVIDERS.has(ToolProviderIdEnum.PagerDuty)).toBe(true);
    expect(ENDPOINT_ROUTED_TOOL_PROVIDERS.has(ToolProviderIdEnum.Opsgenie)).toBe(true);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.PagerDuty)).toBe(true);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Opsgenie)).toBe(true);
  });

  it('routes tool-webhook by routingMode only', () => {
    expect(isToolWebhookDynamicRouting(undefined)).toBe(false);
    expect(isToolWebhookDynamicRouting({ routingMode: 'static' })).toBe(false);
    expect(isToolWebhookDynamicRouting({ routingMode: 'dynamic' })).toBe(true);

    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Webhook)).toBe(false);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Webhook, { routingMode: 'static' })).toBe(false);
    expect(isEndpointRoutedToolProvider(ToolProviderIdEnum.Webhook, { routingMode: 'dynamic' })).toBe(true);
  });
});

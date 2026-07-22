import { describe, expect, it } from 'vitest';
import { ChannelTypeEnum, CredentialsKeyEnum, ToolProviderIdEnum } from '../../../types';
import { toolWebhookConfig } from '../credentials';
import { PROVIDER_ID_TO_CHANNEL_MAP, providers } from '../providers';
import { toolProviders } from './tool';

describe('toolProviders', () => {
  it('includes PagerDuty, Opsgenie, and Tool webhook providers on the tool channel', () => {
    expect(toolProviders).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ToolProviderIdEnum.PagerDuty,
          channel: ChannelTypeEnum.TOOL,
        }),
        expect.objectContaining({
          id: ToolProviderIdEnum.Opsgenie,
          channel: ChannelTypeEnum.TOOL,
        }),
        expect.objectContaining({
          id: ToolProviderIdEnum.Webhook,
          channel: ChannelTypeEnum.TOOL,
        }),
      ])
    );
    expect(ToolProviderIdEnum.PagerDuty).toBe('pagerduty');
    expect(ToolProviderIdEnum.Opsgenie).toBe('opsgenie');
    expect(ToolProviderIdEnum.Webhook).toBe('tool-webhook');
  });

  it('shapes toolWebhookConfig with routingMode and static/dynamic credential fields', () => {
    expect(toolWebhookConfig.map((credential) => credential.key)).toEqual([
      CredentialsKeyEnum.RoutingMode,
      CredentialsKeyEnum.Method,
      CredentialsKeyEnum.WebhookUrl,
      CredentialsKeyEnum.Headers,
      CredentialsKeyEnum.Body,
      CredentialsKeyEnum.SecretKey,
    ]);

    const routingMode = toolWebhookConfig.find((credential) => credential.key === CredentialsKeyEnum.RoutingMode);
    expect(routingMode?.value).toBe('static');
    expect(routingMode?.dropdown).toEqual([
      { name: 'Static', value: 'static' },
      { name: 'Dynamic', value: 'dynamic' },
    ]);

    const webhookUrl = toolWebhookConfig.find((credential) => credential.key === CredentialsKeyEnum.WebhookUrl);
    expect(webhookUrl?.required).toBe(false);
  });

  it('is included in the shared providers array', () => {
    const toolFromProviders = providers.filter((provider) => provider.channel === ChannelTypeEnum.TOOL);

    expect(toolFromProviders).toHaveLength(3);
    expect(toolFromProviders.map((provider) => provider.id).sort()).toEqual(['opsgenie', 'pagerduty', 'tool-webhook']);
  });

  it('maps pagerduty, opsgenie, and tool-webhook provider ids to ChannelTypeEnum.TOOL', () => {
    expect(PROVIDER_ID_TO_CHANNEL_MAP['pagerduty']).toBe(ChannelTypeEnum.TOOL);
    expect(PROVIDER_ID_TO_CHANNEL_MAP['opsgenie']).toBe(ChannelTypeEnum.TOOL);
    expect(PROVIDER_ID_TO_CHANNEL_MAP['tool-webhook']).toBe(ChannelTypeEnum.TOOL);
  });
});

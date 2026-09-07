import { ChannelTypeEnum, ToolProviderIdEnum } from '../../../types';
import { UTM_CAMPAIGN_QUERY_PARAM } from '../../../ui';
import { grafanaConfig, opsgenieConfig, pagerdutyConfig, toolWebhookConfig } from '../credentials';
import { IProviderConfig } from '../provider.interface';

export const toolProviders: IProviderConfig[] = [
  {
    id: ToolProviderIdEnum.PagerDuty,
    displayName: 'PagerDuty',
    channel: ChannelTypeEnum.TOOL,
    credentials: pagerdutyConfig,
    docReference: `https://docs.novu.co/platform/integrations/tool/pagerduty${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'pager-duty.svg', dark: 'pager-duty.svg' },
    betaVersion: true,
  },
  {
    id: ToolProviderIdEnum.Opsgenie,
    displayName: 'Opsgenie',
    channel: ChannelTypeEnum.TOOL,
    credentials: opsgenieConfig,
    docReference: `https://docs.novu.co/platform/integrations/tool/opsgenie${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'opsgenie.svg', dark: 'opsgenie.svg' },
    betaVersion: true,
  },
  {
    id: ToolProviderIdEnum.Grafana,
    displayName: 'Grafana',
    channel: ChannelTypeEnum.TOOL,
    credentials: grafanaConfig,
    docReference: `https://docs.novu.co/platform/integrations/tool/grafana${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'grafana-on-call.svg', dark: 'grafana-on-call.svg' },
    betaVersion: true,
  },
  {
    id: ToolProviderIdEnum.Webhook,
    displayName: 'Tool webhook',
    channel: ChannelTypeEnum.TOOL,
    credentials: toolWebhookConfig,
    docReference: `https://docs.novu.co/platform/integrations/tool/webhook${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'webhook.svg', dark: 'webhook.svg' },
    betaVersion: true,
  },
];

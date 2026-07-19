import { ChannelTypeEnum, ToolProviderIdEnum } from '../../../types';
import { UTM_CAMPAIGN_QUERY_PARAM } from '../../../ui';
import { opsgenieConfig, pagerdutyConfig, toolWebhookConfig } from '../credentials';
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
    id: ToolProviderIdEnum.Webhook,
    displayName: 'Tool webhook',
    channel: ChannelTypeEnum.TOOL,
    credentials: toolWebhookConfig,
    docReference: `https://docs.novu.co/platform/integrations${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'tool-webhook.svg', dark: 'tool-webhook.svg' },
    betaVersion: true,
  },
];

import { ChannelTypeEnum, ToolProviderIdEnum } from '../../../types';
import { UTM_CAMPAIGN_QUERY_PARAM } from '../../../ui';
import { githubToolConfig, toolWebhookConfig } from '../credentials';
import { IProviderConfig } from '../provider.interface';

export const toolProviders: IProviderConfig[] = [
  {
    id: ToolProviderIdEnum.GitHub,
    displayName: 'GitHub',
    channel: ChannelTypeEnum.TOOL,
    credentials: githubToolConfig,
    docReference: `https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'github.svg', dark: 'github.svg' },
    betaVersion: true,
  },
  {
    id: ToolProviderIdEnum.Webhook,
    displayName: 'Custom Webhook',
    channel: ChannelTypeEnum.TOOL,
    credentials: toolWebhookConfig,
    docReference: `https://docs.novu.co/platform/integrations/tool/webhook${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'tool-webhook.svg', dark: 'tool-webhook.svg' },
    betaVersion: true,
  },
];

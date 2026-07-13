import { ChannelTypeEnum, SignalsProviderIdEnum } from '../../../types';
import { UTM_CAMPAIGN_QUERY_PARAM } from '../../../ui';
import { githubSignalsConfig, signalsWebhookConfig } from '../credentials';
import { IProviderConfig } from '../provider.interface';

export const signalsProviders: IProviderConfig[] = [
  {
    id: SignalsProviderIdEnum.GitHub,
    displayName: 'GitHub',
    channel: ChannelTypeEnum.SIGNALS,
    credentials: githubSignalsConfig,
    docReference: `https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'github.svg', dark: 'github.svg' },
    betaVersion: true,
  },
  {
    id: SignalsProviderIdEnum.Webhook,
    displayName: 'Custom Webhook',
    channel: ChannelTypeEnum.SIGNALS,
    credentials: signalsWebhookConfig,
    docReference: `https://docs.novu.co/platform/integrations/signals/webhook${UTM_CAMPAIGN_QUERY_PARAM}`,
    logoFileName: { light: 'signals-webhook.svg', dark: 'signals-webhook.svg' },
    betaVersion: true,
  },
];

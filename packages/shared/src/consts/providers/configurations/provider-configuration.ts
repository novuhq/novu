import { ConfigConfiguration, ConfigConfigurationGroup } from '../provider.interface';

const sendgridConfigurations: ConfigConfiguration[] = [
  {
    key: 'inboundWebhookEnabled',
    displayName: 'Email Activity Tracking',
    description:
      'When enabled, Novu will auto-configure delivery webhooks using your existing API key. If they lack permissions, follow the manual set-up guide.',
    type: 'switch',
    required: false,
  },
  {
    key: 'inboundWebhookSigningKey',
    displayName: 'Inbound Webhook Signing Key',
    type: 'string',
    required: false,
  },
];

export const sendgridGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: sendgridConfigurations,
    enabler: 'inboundWebhookEnabled',
    loadingLabel: 'Enabling tracking…',
  },
];

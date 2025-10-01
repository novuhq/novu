import { ConfigConfiguration, ConfigConfigurationGroup } from '../provider.interface';

const emailActivityTrackingDescription =
  'When enabled, Novu will auto-configure delivery webhooks using your existing API key. If they lack permissions, follow the manual set-up guide.';

const pushActivityTrackingDescription =
  'Enable receiving push events to track delivery status and user interactions with push notifications.';

const sendgridConfigurations: ConfigConfiguration[] = [
  {
    key: 'inboundWebhookEnabled',
    displayName: 'Email Activity Tracking',
    description: emailActivityTrackingDescription,
    type: 'switch',
    required: false,
    links: [
      {
        text: 'set-up guide',
        url: 'https://docs.novu.co/platform/integrations/email/sendgrid#manual-setup',
      },
    ],
  },
  {
    key: 'inboundWebhookSigningKey',
    displayName: 'Inbound Webhook Signing Key',
    type: 'string',
    required: false,
  },
];

const resendConfigurations: ConfigConfiguration[] = [
  {
    key: 'inboundWebhookEnabled',
    displayName: 'Email Activity Tracking',
    description: emailActivityTrackingDescription,
    type: 'switch',
    required: false,
    links: [
      {
        text: 'set-up guide',
        url: 'https://docs.novu.co/platform/integrations/email/resend#manual-setup',
      },
    ],
  },
  {
    key: 'inboundWebhookSigningKey',
    displayName: 'Inbound Webhook Signing Key',
    type: 'string',
    required: false,
  },
];

const mailgunConfigurations: ConfigConfiguration[] = [
  {
    key: 'inboundWebhookEnabled',
    displayName: 'Email Activity Tracking',
    description: emailActivityTrackingDescription,
    type: 'switch',
    required: false,
    links: [
      {
        text: 'set-up guide',
        url: 'https://docs.novu.co/platform/integrations/email/mailgun#manual-setup',
      },
    ],
  },
  {
    key: 'inboundWebhookSigningKey',
    displayName: 'Inbound Webhook Signing Key',
    type: 'string',
    required: false,
  },
];

const sesConfigurations: ConfigConfiguration[] = [
  {
    key: 'inboundWebhookEnabled',
    displayName: 'Email Activity Tracking',
    description: emailActivityTrackingDescription,
    type: 'switch',
    required: false,
    links: [
      {
        text: 'set-up guide',
        url: 'https://docs.novu.co/platform/integrations/email/amazon-ses#manual-setup',
      },
    ],
  },
  {
    key: 'configurationSetName',
    displayName: 'Configuration Set Name',
    type: 'string',
    required: false,
  },
];

export const expoConfigurations: ConfigConfiguration[] = [
  {
    key: 'inboundWebhookEnabled',
    displayName: 'Push Activity Tracking',
    description: pushActivityTrackingDescription,
    type: 'switch',
    required: false,
  },
  {
    key: 'pushResources',
    displayName: 'Push Resources',
    type: 'pushResources',
    required: false,
  },
];

export const sendgridGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: sendgridConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide:
      'https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook#add-an-event-webhook',
  },
];

export const resendGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: resendConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide: 'https://resend.com/docs/dashboard/webhooks/introduction#what-is-a-webhook%3F',
  },
];

export const mailgunGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: mailgunConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide: 'https://documentation.mailgun.com/docs/mailgun/user-manual/events/webhooks',
  },
];

export const sesGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: sesConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide:
      'https://www.twilio.com/docs/sendgrid/for-developers/tracking-events/getting-started-event-webhook#add-an-event-webhook',
  },
];

export const expoGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: expoConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide: 'https://docs.expo.dev/push-notifications/sending-notifications/',
  },
];

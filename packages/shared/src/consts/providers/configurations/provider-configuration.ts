import { InboxCountTypeEnum } from '../../../entities/integration/configuration.interface';
import { ConfigConfiguration, ConfigConfigurationGroup } from '../provider.interface';

const emailActivityTrackingTooltip =
  'When enabled, Novu will auto-configure delivery webhooks using your existing API key. If they lack permissions, follow the manual set-up guide.';

const sendgridConfigurations: ConfigConfiguration[] = [
  {
    key: 'inboundWebhookEnabled',
    displayName: 'Email Activity Tracking',
    tooltip: emailActivityTrackingTooltip,
    type: 'switch',
    required: false,
    links: [
      {
        text: 'manual set-up guide',
        url: 'https://docs.novu.co/platform/integrations/email/activity-tracking/manual-configuration/sendgrid',
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
    tooltip: emailActivityTrackingTooltip,
    type: 'switch',
    required: false,
    links: [
      {
        text: 'manual set-up guide',
        url: 'https://docs.novu.co/platform/integrations/email/activity-tracking/manual-configuration/resend',
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
    tooltip: emailActivityTrackingTooltip,
    type: 'switch',
    required: false,
    links: [
      {
        text: 'manual set-up guide',
        url: 'https://docs.novu.co/platform/integrations/email/activity-tracking/manual-configuration/mailgun',
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
    tooltip: emailActivityTrackingTooltip,
    type: 'switch',
    required: false,
    links: [
      {
        text: 'manual set-up guide',
        url: 'https://docs.novu.co/platform/integrations/email/activity-tracking/manual-configuration/ses',
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

export const pushConfigurations: ConfigConfiguration[] = [
  {
    key: 'inboundWebhookEnabled',
    displayName: 'Push Activity Tracking',
    tooltip: 'Enable receiving push events to track delivery status and user interactions with push notifications.',
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
      'https://docs.novu.co/platform/integrations/email/activity-tracking/manual-configuration/sendgrid',
  },
];

export const resendGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: resendConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide:
      'https://docs.novu.co/platform/integrations/email/activity-tracking/manual-configuration/resend',
  },
];

export const mailgunGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: mailgunConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide:
      'https://docs.novu.co/platform/integrations/email/activity-tracking/manual-configuration/mailgun',
  },
];

export const sesGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: sesConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide: 'https://docs.novu.co/platform/integrations/email/activity-tracking/manual-configuration/ses',
  },
];

export const pushpadGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: pushConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide: 'https://developer.android.com/develop/ui/views/notifications/build-notification',
  },
];

export const fcmGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: pushConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide: 'https://developer.android.com/develop/ui/views/notifications/build-notification',
  },
  {
    groupType: 'crossChannelConfigs',
    configurations: [
      {
        key: 'inboxCount',
        displayName: 'Use inbox count in badge',
        type: 'dropdown',
        value: InboxCountTypeEnum.NONE,
        placeholder: 'Select count type',
        dropdown: [
          { name: 'None', value: InboxCountTypeEnum.NONE },
          { name: 'Unread', value: InboxCountTypeEnum.UNREAD },
          { name: 'Unseen', value: InboxCountTypeEnum.UNSEEN },
        ],
        required: false,
        tooltip:
          'When selected, Novu will include the Inbox unread or unseen count in the FCM message payload. This will allow you to display the count in the app badge or use it in your custom logic.',
      },
    ],
    setupWebhookUrlGuide: 'https://docs.novu.co/platform/integrations/push?utm_campaign=in-app',
  },
];

export const expoGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: pushConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide: 'https://docs.expo.dev/push-notifications/sending-notifications/',
  },
];

export const apnsGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: pushConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide:
      'https://developer.apple.com/documentation/usernotifications/unusernotificationcenterdelegate',
  },
];

export const pushWebhookGroupConfigurations: ConfigConfigurationGroup[] = [
  {
    groupType: 'inboundWebhook',
    configurations: pushConfigurations,
    enabler: 'inboundWebhookEnabled',
    setupWebhookUrlGuide: 'https://docs.novu.co/platform/integrations/push/push-webhook?utm_campaign=in-app',
  },
];

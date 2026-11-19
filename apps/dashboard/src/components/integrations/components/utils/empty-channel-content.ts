import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  PushProviderIdEnum,
  SmsProviderIdEnum,
  ToolProviderIdEnum,
} from '@novu/shared';

type EmptyChannelContent = {
  title: string;
  description: string;
  /** Label of the main button; it opens the connect sheet on this channel (Inbox setup for in-app). */
  actionLabel: string;
  docsUrl: string;
  docsLabel: string;
  /** One to three providers for the art; the first sits centre front, the others tilt behind it. */
  providers: [string, ...string[]];
};

/** Empty state for each channel, shown when nothing is connected in the current environment. */
export const EMPTY_CHANNEL_CONTENT: Record<ChannelTypeEnum, EmptyChannelContent> = {
  [ChannelTypeEnum.IN_APP]: {
    title: 'Show notifications right inside your app',
    description:
      'In-app steps in your workflows are skipped until the Inbox is set up. Drop the Inbox component into your app and messages arrive in real time.',
    actionLabel: 'Set up Inbox',
    docsUrl: 'https://docs.novu.co/platform/inbox/overview',
    docsLabel: 'How Inbox works',
    providers: [InAppProviderIdEnum.Novu],
  },
  [ChannelTypeEnum.EMAIL]: {
    title: 'Land in your users’ inbox',
    description:
      'Email steps in your workflows are skipped until a provider is connected. Bring SendGrid, Resend, Postmark, Amazon SES and more.',
    actionLabel: 'Add email provider',
    docsUrl: 'https://docs.novu.co/platform/integrations/email',
    docsLabel: 'How email works',
    providers: [EmailProviderIdEnum.Resend, EmailProviderIdEnum.SendGrid, EmailProviderIdEnum.Postmark],
  },
  [ChannelTypeEnum.SMS]: {
    title: 'Reach users on their phones, no app needed',
    description:
      'SMS steps in your workflows are skipped until a provider is connected. Twilio, Plivo, Amazon SNS and more are supported.',
    actionLabel: 'Add SMS provider',
    docsUrl: 'https://docs.novu.co/platform/integrations/sms',
    docsLabel: 'How SMS works',
    providers: [SmsProviderIdEnum.Twilio, SmsProviderIdEnum.Plivo, SmsProviderIdEnum.SNS],
  },
  [ChannelTypeEnum.PUSH]: {
    title: 'Reach users even when your app is closed',
    description:
      'Push steps in your workflows are skipped until a provider is connected. FCM covers Android and web, APNs covers iOS.',
    actionLabel: 'Add push provider',
    docsUrl: 'https://docs.novu.co/platform/integrations/push',
    docsLabel: 'How push works',
    providers: [PushProviderIdEnum.APNS, PushProviderIdEnum.FCM, PushProviderIdEnum.EXPO],
  },
  [ChannelTypeEnum.CHAT]: {
    title: 'Meet your users where they already talk',
    description:
      'Chat steps in your workflows are skipped until a provider is connected. Send to Slack, Microsoft Teams, Discord, Telegram and WhatsApp.',
    actionLabel: 'Add chat provider',
    docsUrl: 'https://docs.novu.co/platform/integrations/chat',
    docsLabel: 'How chat works',
    providers: [ChatProviderIdEnum.Slack, ChatProviderIdEnum.MsTeams, ChatProviderIdEnum.Discord],
  },
  [ChannelTypeEnum.TOOL]: {
    title: 'Open incidents and call your services from workflows',
    description:
      'Tool steps in your workflows are skipped until a provider is connected. Page on-call with PagerDuty or Opsgenie, or call any endpoint with a webhook.',
    actionLabel: 'Add tool provider',
    docsUrl: 'https://docs.novu.co/platform/integrations',
    docsLabel: 'Integration docs',
    providers: [ToolProviderIdEnum.PagerDuty, ToolProviderIdEnum.Opsgenie, ToolProviderIdEnum.Webhook],
  },
};

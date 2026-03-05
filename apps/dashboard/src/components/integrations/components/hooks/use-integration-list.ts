import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  IProviderConfig,
  NOVU_PROVIDERS,
  ProvidersIdEnum,
  PushProviderIdEnum,
  providers,
  SmsProviderIdEnum,
} from '@novu/shared';
import { useMemo } from 'react';

export function useIntegrationList(searchQuery: string = '') {
  const filteredIntegrations = useMemo(() => {
    if (!providers) return [];

    const filtered = providers.filter(
      (provider: IProviderConfig) =>
        provider.displayName.toLowerCase().includes(searchQuery.toLowerCase()) && !NOVU_PROVIDERS.includes(provider.id)
    );

    const popularityOrder: Record<ChannelTypeEnum, ProvidersIdEnum[]> = {
      [ChannelTypeEnum.EMAIL]: [
        EmailProviderIdEnum.SendGrid,
        EmailProviderIdEnum.Mailgun,
        EmailProviderIdEnum.Postmark,
        EmailProviderIdEnum.Mailjet,
        EmailProviderIdEnum.Mandrill,
        EmailProviderIdEnum.SES,
        EmailProviderIdEnum.Outlook365,
        EmailProviderIdEnum.CustomSMTP,
      ],
      [ChannelTypeEnum.SMS]: [
        SmsProviderIdEnum.Twilio,
        SmsProviderIdEnum.Plivo,
        SmsProviderIdEnum.SNS,
        SmsProviderIdEnum.Nexmo,
        SmsProviderIdEnum.Telnyx,
        SmsProviderIdEnum.Sms77,
        SmsProviderIdEnum.Infobip,
        SmsProviderIdEnum.Gupshup,
      ],
      [ChannelTypeEnum.PUSH]: [
        PushProviderIdEnum.FCM,
        PushProviderIdEnum.EXPO,
        PushProviderIdEnum.APNS,
        PushProviderIdEnum.OneSignal,
      ],
      [ChannelTypeEnum.CHAT]: [
        ChatProviderIdEnum.Slack,
        ChatProviderIdEnum.Discord,
        ChatProviderIdEnum.MsTeams,
        ChatProviderIdEnum.Mattermost,
        ChatProviderIdEnum.ChatWebhook,
      ],
      [ChannelTypeEnum.IN_APP]: [],
    };

    return filtered.sort((a, b) => {
      const channelOrder = popularityOrder[a.channel] || [];
      const indexA = channelOrder.indexOf(a.id);
      const indexB = channelOrder.indexOf(b.id);

      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }

      if (indexA !== -1) return -1;
      if (indexB !== -1) return 1;

      return 0;
    });
  }, [providers, searchQuery]);

  const integrationsByChannel = useMemo(() => {
    return Object.values(ChannelTypeEnum).reduce(
      (acc, channel) => {
        acc[channel] = filteredIntegrations.filter((provider: IProviderConfig) => provider.channel === channel);

        return acc;
      },
      {} as Record<ChannelTypeEnum, IProviderConfig[]>
    );
  }, [filteredIntegrations]);

  return {
    filteredIntegrations,
    integrationsByChannel,
  };
}

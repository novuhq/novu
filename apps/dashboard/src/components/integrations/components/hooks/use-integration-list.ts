import { useMemo } from 'react';
import { ChannelTypeEnum, ChatProviderIdEnum, IProviderConfig, PushProviderIdEnum } from '@novu/shared';
import { providers, EmailProviderIdEnum, SmsProviderIdEnum } from '@novu/shared';
import { ProvidersIdEnum } from '@novu/shared';

export function useIntegrationList(searchQuery: string = '') {
  const filteredIntegrations = useMemo(() => {
    if (!providers) return [];

    const filtered = providers.filter(
      (provider: IProviderConfig) =>
        provider.displayName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        provider.id !== EmailProviderIdEnum.Novu &&
        provider.id !== SmsProviderIdEnum.Novu
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

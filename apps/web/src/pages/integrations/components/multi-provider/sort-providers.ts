import {
  ChannelTypeEnum,
  ChatProviderIdEnum,
  EmailProviderIdEnum,
  InAppProviderIdEnum,
  ProvidersIdEnum,
  PushProviderIdEnum,
  SmsProviderIdEnum,
} from '@novu/shared';

import type { IIntegratedProvider } from '../../types';

const providers: Record<ChannelTypeEnum, ProvidersIdEnum[]> = {
  [ChannelTypeEnum.CHAT]: [
    ChatProviderIdEnum.Slack,
    ChatProviderIdEnum.MsTeams,
    ChatProviderIdEnum.Discord,
    ChatProviderIdEnum.Mattermost,
    ChatProviderIdEnum.GrafanaOnCall,
  ],
  [ChannelTypeEnum.EMAIL]: [
    EmailProviderIdEnum.SendGrid,
    EmailProviderIdEnum.Mailjet,
    EmailProviderIdEnum.Postmark,
    EmailProviderIdEnum.Mailgun,
    EmailProviderIdEnum.Sendinblue,
    EmailProviderIdEnum.Mandrill,
    EmailProviderIdEnum.EmailJS,
    EmailProviderIdEnum.SES,
    EmailProviderIdEnum.MailerSend,
    EmailProviderIdEnum.Outlook365,
    EmailProviderIdEnum.Resend,
    EmailProviderIdEnum.Infobip,
    ...[
      EmailProviderIdEnum.CustomSMTP,
      EmailProviderIdEnum.NetCore,
      EmailProviderIdEnum.Clickatell,
      EmailProviderIdEnum.Novu,
      EmailProviderIdEnum.SparkPost,
      EmailProviderIdEnum.EmailWebhook,
    ].sort(),
  ],
  [ChannelTypeEnum.IN_APP]: [InAppProviderIdEnum.Novu],
  [ChannelTypeEnum.PUSH]: [
    PushProviderIdEnum.EXPO,
    PushProviderIdEnum.FCM,
    PushProviderIdEnum.APNS,
    PushProviderIdEnum.PushWebhook,
    PushProviderIdEnum.OneSignal,
    PushProviderIdEnum.Pushpad,
    PushProviderIdEnum.PusherBeams,
  ],
  [ChannelTypeEnum.SMS]: [
    SmsProviderIdEnum.Twilio,
    SmsProviderIdEnum.BurstSms,
    SmsProviderIdEnum.Nexmo,
    SmsProviderIdEnum.Plivo,
    SmsProviderIdEnum.Infobip,
    SmsProviderIdEnum.Sms77,
    SmsProviderIdEnum.Gupshup,
    ...[
      SmsProviderIdEnum.SmsCentral,
      SmsProviderIdEnum.SNS,
      SmsProviderIdEnum.Telnyx,
      SmsProviderIdEnum.Firetext,
      SmsProviderIdEnum.Clickatell,
      SmsProviderIdEnum.FortySixElks,
      SmsProviderIdEnum.Kannel,
      SmsProviderIdEnum.Maqsam,
      SmsProviderIdEnum.Termii,
      SmsProviderIdEnum.AfricasTalking,
      SmsProviderIdEnum.Novu,
      SmsProviderIdEnum.AzureSms,
      SmsProviderIdEnum.Bandwidth,
      SmsProviderIdEnum.Simpletexting,
      SmsProviderIdEnum.BrevoSms,
      SmsProviderIdEnum.ISendSms,
      SmsProviderIdEnum.EazySms,
    ].sort(),
  ],
};

export const sortProviders = (
  channel: ChannelTypeEnum
): ((a: IIntegratedProvider, b: IIntegratedProvider) => 1 | -1 | 0) => {
  const order: ProvidersIdEnum[] = providers[channel];

  return (a: IIntegratedProvider, b: IIntegratedProvider) => {
    const aIndex = order.indexOf(a.providerId);
    const bIndex = order.indexOf(b.providerId);

    if (aIndex > bIndex) {
      return 1;
    }
    if (aIndex < bIndex) {
      return -1;
    }

    return 0;
  };
};

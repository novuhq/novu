import { IProviderConfig } from './provider.interface';
import { chatProviders, emailProviders, smsProviders, pushProviders, inAppProviders } from './channels';
import { InAppProviderIdEnum, EmailProviderIdEnum, ProvidersIdEnum, SmsProviderIdEnum } from './provider.enum';

export { chatProviders, emailProviders, smsProviders, pushProviders, inAppProviders } from './channels';

export const providers: IProviderConfig[] = [
  ...emailProviders,
  ...smsProviders,
  ...chatProviders,
  ...pushProviders,
  ...inAppProviders,
];

export const NOVU_PROVIDERS: ProvidersIdEnum[] = [
  InAppProviderIdEnum.Novu,
  SmsProviderIdEnum.Novu,
  EmailProviderIdEnum.Novu,
];

export const NOVU_SMS_EMAIL_PROVIDERS: ProvidersIdEnum[] = [SmsProviderIdEnum.Novu, EmailProviderIdEnum.Novu];

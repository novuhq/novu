import { IProviderConfig } from './provider.interface';
import { chatProviders, emailProviders, smsProviders, pushProviders, inAppProviders } from './channels';
import { EmailProviderIdEnum, ProvidersIdEnum, SmsProviderIdEnum } from './provider.enum';

export { chatProviders, emailProviders, smsProviders, pushProviders, inAppProviders } from './channels';

export const providers: IProviderConfig[] = [
  ...emailProviders,
  ...smsProviders,
  ...chatProviders,
  ...pushProviders,
  ...inAppProviders,
];

export const NOVU_PROVIDERS: ProvidersIdEnum[] = [SmsProviderIdEnum.Novu, EmailProviderIdEnum.Novu];

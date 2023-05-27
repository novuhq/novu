import { IProviderConfig } from './provider.interface';
import { chatProviders, emailProviders, smsProviders, pushProviders, inAppProviders } from './channels';

export const providers: IProviderConfig[] = [
  ...emailProviders,
  ...smsProviders,
  ...chatProviders,
  ...pushProviders,
  ...inAppProviders,
];

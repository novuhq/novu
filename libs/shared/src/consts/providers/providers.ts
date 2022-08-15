import { IProviderConfig } from './provider.interface';
import { chatProviders, emailProviders, smsProviders, pushProviders } from './channels';

export const providers: IProviderConfig[] = [...emailProviders, ...smsProviders, ...chatProviders, ...pushProviders];

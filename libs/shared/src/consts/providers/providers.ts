import { IProviderConfig } from './provider.interface';
import { directProviders, emailProviders, smsProviders, pushProviders } from './channels';

export const providers: IProviderConfig[] = [...emailProviders, ...smsProviders, ...directProviders, ...pushProviders];

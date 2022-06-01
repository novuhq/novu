import { IProviderConfig } from './provider.interface';
import { directProviders, emailProviders, smsProviders } from './channels';

export const providers: IProviderConfig[] = [...emailProviders, ...smsProviders, ...directProviders];

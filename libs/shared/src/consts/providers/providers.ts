import { IProviderConfig } from './provider.interface';
import { emailProviders, smsProviders } from './channels';

export const providers: IProviderConfig[] = [...emailProviders, ...smsProviders];

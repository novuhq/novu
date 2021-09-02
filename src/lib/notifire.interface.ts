import { ProviderStore } from './provider/provider.store';
import { TemplateStore } from './template/template.store';

export interface INotifireConfig {
  channels?: {
    email?: {
      from?: { name: string; email: string };
    };
  };
  variableProtection?: boolean;
  templateStore?: TemplateStore;
  providerStore?: ProviderStore;
}

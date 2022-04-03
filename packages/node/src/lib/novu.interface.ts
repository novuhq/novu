import { ProviderStore } from './provider/provider.store';
import { TemplateStore } from './template/template.store';
import { ThemeStore } from './theme/theme.store';

export interface INovuConfig {
  channels?: {
    email?: {
      from?: { name: string; email: string };
    };
  };
  variableProtection?: boolean;
  templateStore?: TemplateStore;
  providerStore?: ProviderStore;
  themeStore?: ThemeStore;
}

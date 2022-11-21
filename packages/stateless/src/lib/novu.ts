import merge from 'lodash.merge';
import { EventEmitter } from 'events';
import { INovuConfig } from './novu.interface';
import {
  IEmailProvider,
  ISmsProvider,
  IChatProvider,
  IPushProvider,
} from './provider/provider.interface';
import { ProviderStore } from './provider/provider.store';
import { ITemplate, ITriggerPayload } from './template/template.interface';
import { TemplateStore } from './template/template.store';
import { TriggerEngine } from './trigger/trigger.engine';
import { ThemeStore } from './theme/theme.store';
import { ITheme } from './theme/theme.interface';
import {
  HandlebarsContentEngine,
  IContentEngine,
} from './content/content.engine';

export class NovuStateless extends EventEmitter {
  private readonly templateStore: TemplateStore;
  private readonly providerStore: ProviderStore;
  private readonly themeStore: ThemeStore;
  private readonly config: INovuConfig;
  private readonly contentEngine: IContentEngine;

  constructor(config?: INovuConfig) {
    super();

    const defaultConfig: Partial<INovuConfig> = {
      variableProtection: true,
    };

    if (config) {
      this.config = merge(defaultConfig, config);
    }

    this.themeStore = this.config?.themeStore || new ThemeStore();
    this.templateStore = this.config?.templateStore || new TemplateStore();
    this.providerStore = this.config?.providerStore || new ProviderStore();
    this.contentEngine =
      this.config?.contentEngine || new HandlebarsContentEngine();
  }

  async registerTheme(id: string, theme: ITheme) {
    return await this.themeStore.addTheme(id, theme);
  }

  async setDefaultTheme(themeId: string) {
    await this.themeStore.setDefaultTheme(themeId);
  }

  async registerTemplate(template: ITemplate) {
    await this.templateStore.addTemplate(template);

    return await this.templateStore.getTemplateById(template.id);
  }

  async registerProvider(
    provider: IEmailProvider | ISmsProvider | IChatProvider | IPushProvider
  );

  async registerProvider(
    providerId: string,
    provider: IEmailProvider | ISmsProvider | IChatProvider | IPushProvider
  );

  async registerProvider(
    providerOrProviderId:
      | string
      | IEmailProvider
      | ISmsProvider
      | IChatProvider
      | IPushProvider,
    provider?: IEmailProvider | ISmsProvider | IChatProvider | IPushProvider
  ) {
    await this.providerStore.addProvider(
      typeof providerOrProviderId === 'string'
        ? providerOrProviderId
        : provider?.id,
      typeof providerOrProviderId === 'string' ? provider : providerOrProviderId
    );
  }

  async getProviderByInternalId(providerId: string) {
    return this.providerStore.getProviderByInternalId(providerId);
  }

  async trigger(eventId: string, data: ITriggerPayload) {
    const triggerEngine = new TriggerEngine(
      this.templateStore,
      this.providerStore,
      this.themeStore,
      this.contentEngine,
      this.config,
      this
    );

    return await triggerEngine.trigger(eventId, data);
  }
}

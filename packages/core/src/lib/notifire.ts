import merge from 'lodash.merge';
import { EventEmitter } from 'events';
import axios, { AxiosInstance } from 'axios';
import { INotifireConfig } from './notifire.interface';
import {
  IEmailProvider,
  ISmsProvider,
  IDirectProvider,
} from './provider/provider.interface';
import { ProviderStore } from './provider/provider.store';
import { ITemplate, ITriggerPayload } from './template/template.interface';
import { TemplateStore } from './template/template.store';
import { TriggerEngine } from './trigger/trigger.engine';
import { ThemeStore } from './theme/theme.store';
import { ITheme } from './theme/theme.interface';

export class Novu extends EventEmitter {
  private readonly templateStore: TemplateStore;
  private readonly providerStore: ProviderStore;
  private readonly themeStore: ThemeStore;
  private readonly config: INotifireConfig;
  private readonly apiKey?: string;
  private readonly http: AxiosInstance;

  constructor(config?: INotifireConfig);
  constructor(apiKey?: string);
  constructor(configOrApiKey?: INotifireConfig | string) {
    super();

    const defaultConfig: Partial<INotifireConfig> = {
      variableProtection: true,
    };

    if (configOrApiKey) {
      if (typeof configOrApiKey === 'string') {
        this.apiKey = configOrApiKey;
        this.config = { ...defaultConfig };

        this.http = axios.create({
          baseURL: 'https://api.novu.co/v1',
          headers: {
            Authorization: `ApiKey ${this.apiKey}`,
          },
        });
      } else {
        this.config = merge(defaultConfig, configOrApiKey);
      }
    }

    this.themeStore = this.config?.themeStore || new ThemeStore();
    this.templateStore = this.config?.templateStore || new TemplateStore();
    this.providerStore = this.config?.providerStore || new ProviderStore();
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
    provider: IEmailProvider | ISmsProvider | IDirectProvider
  );

  async registerProvider(
    providerId: string,
    provider: IEmailProvider | ISmsProvider | IDirectProvider
  );

  async registerProvider(
    providerOrProviderId:
      | string
      | IEmailProvider
      | ISmsProvider
      | IDirectProvider,
    provider?: IEmailProvider | ISmsProvider | IDirectProvider
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
    if (this.apiKey) {
      return await this.http.post(`/events/trigger`, {
        name: eventId,
        payload: {
          ...data,
        },
      });
    }

    const triggerEngine = new TriggerEngine(
      this.templateStore,
      this.providerStore,
      this.themeStore,
      this.config,
      this
    );

    return await triggerEngine.trigger(eventId, data);
  }
}

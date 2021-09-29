import merge from 'lodash.merge';
import { EventEmitter } from 'events';
import { INotifireConfig } from './notifire.interface';
import { IEmailProvider, ISmsProvider } from './provider/provider.interface';
import { ProviderStore } from './provider/provider.store';
import { ITemplate, ITriggerPayload } from './template/template.interface';
import { TemplateStore } from './template/template.store';
import { TriggerEngine } from './trigger/trigger.engine';


export class Notifire extends EventEmitter {
  private readonly templateStore: TemplateStore;
  private readonly providerStore: ProviderStore;

  constructor(private config?: INotifireConfig) {
    super();

    const defaultConfig: Partial<INotifireConfig> = {
      variableProtection: true,
    };
    this.config = merge(defaultConfig, config);

    this.templateStore = this.config?.templateStore || new TemplateStore();
    this.providerStore = this.config?.providerStore || new ProviderStore();
  }

  async registerTemplate(template: ITemplate) {
    await this.templateStore.addTemplate(template);

    return await this.templateStore.getTemplateById(template.id);
  }

  async registerProvider(provider: IEmailProvider | ISmsProvider) {
    await this.providerStore.addProvider(provider);
  }

  async getProviderById(providerId: string) {
    return this.providerStore.getProviderById(providerId);
  }

  async trigger(eventId: string, data: ITriggerPayload) {
    const triggerEngine = new TriggerEngine(
      this.templateStore,
      this.providerStore,
      this.config,
      this
    );

    return await triggerEngine.trigger(eventId, data);
  }
}

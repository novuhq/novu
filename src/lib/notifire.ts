import EventEmitter from 'events';

import { EmailHandler } from './handler/email.handler';
import { SmsHandler } from './handler/sms.handler';
import { INotifireConfig } from './notifire.interface';
import { IEmailProvider, ISmsProvider } from './provider/provider.interface';
import { ProviderStore } from './provider/provider.store';
import {
  ChannelTypeEnum,
  ITemplate,
  ITriggerPayload,
} from './template/template.interface';
import { TemplateStore } from './template/template.store';

export class Notifire extends EventEmitter {
  private templateStore: TemplateStore;
  private providerStore: ProviderStore;

  constructor(private config?: INotifireConfig) {
    super();
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

  async trigger(eventId: string, data: ITriggerPayload) {
    const template = await this.templateStore.getTemplateById(eventId);
    if (!template) {
      throw new Error(
        `Template on event: ${eventId} was not found in the template store`
      );
    }

    for (const message of template.messages) {
      const provider = await this.providerStore.getProviderByChannel(
        message.channel
      );

      if (!provider) {
        throw new Error(
          `Provider for ${message.channel} channel was not found`
        );
      }

      this.emit('pre:send', {
        id: template.id,
        channel: message.channel,
        message,
        trigger: data,
      });

      if (provider.channelType === ChannelTypeEnum.EMAIL) {
        const emailHandler = new EmailHandler(message, provider);
        await emailHandler.send(data);
      } else if (provider.channelType === ChannelTypeEnum.SMS) {
        const smsHandler = new SmsHandler(message, provider);
        await smsHandler.send(data);
      }

      this.emit('post:send', {
        id: template.id,
        channel: message.channel,
        message,
        trigger: data,
      });
    }
  }
}

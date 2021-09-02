import { EmailHandler } from '../handler/email.handler';
import { SmsHandler } from '../handler/sms.handler';
import { ProviderStore } from '../provider/provider.store';
import {
  ChannelTypeEnum,
  IMessage,
  ITriggerPayload,
} from '../template/template.interface';
import { TemplateStore } from '../template/template.store';

export class TriggerEngine {
  constructor(
    private templateStore: TemplateStore,
    private providerStore: ProviderStore
  ) {}

  async trigger(eventId: string, data: ITriggerPayload) {
    const template = await this.templateStore.getTemplateById(eventId);
    if (!template) {
      throw new Error(
        `Template on event: ${eventId} was not found in the template store`
      );
    }

    const activeMessages: IMessage[] =
      await this.templateStore.getActiveMessages(template, data);

    for (const message of activeMessages) {
      await this.processTemplateMessage(message, data);
    }
  }

  async processTemplateMessage(message: IMessage, data: ITriggerPayload) {
    const provider = await this.providerStore.getProviderByChannel(
      message.channel
    );

    if (!provider) {
      throw new Error(`Provider for ${message.channel} channel was not found`);
    }

    if (provider.channelType === ChannelTypeEnum.EMAIL) {
      const emailHandler = new EmailHandler(message, provider);
      await emailHandler.send(data);
    } else if (provider.channelType === ChannelTypeEnum.SMS) {
      const smsHandler = new SmsHandler(message, provider);
      await smsHandler.send(data);
    }
  }
}

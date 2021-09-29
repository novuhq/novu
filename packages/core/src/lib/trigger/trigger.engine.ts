import _get from 'lodash.get';
import { EventEmitter } from 'events';

import { getHandlebarsVariables } from '../content/content.engine';

import { EmailHandler } from '../handler/email.handler';
import { SmsHandler } from '../handler/sms.handler';
import { INotifireConfig } from '../notifire.interface';
import { ProviderStore } from '../provider/provider.store';
import {
  ChannelTypeEnum,
  IMessage,
  ITemplate,
  ITriggerPayload,
} from '../template/template.interface';
import { TemplateStore } from '../template/template.store';

export class TriggerEngine {
  constructor(
    private templateStore: TemplateStore,
    private providerStore: ProviderStore,
    private config: INotifireConfig,
    private eventEmitter: EventEmitter
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
      await this.processTemplateMessage(template, message, data);
    }
  }

  async processTemplateMessage(
    template: ITemplate,
    message: IMessage,
    data: ITriggerPayload
  ) {
    const provider = await this.providerStore.getProviderByChannel(
      message.channel
    );

    if (!provider) {
      throw new Error(`Provider for ${message.channel} channel was not found`);
    }

    const missingVariables = this.getMissingVariables(message, data);
    if (missingVariables.length && this.config.variableProtection) {
      throw new Error(
        'Missing variables passed. ' + missingVariables.toString()
      );
    }

    this.eventEmitter.emit('pre:send', {
      id: template.id,
      channel: message.channel,
      message,
      triggerPayload: data,
    });

    if (provider.channelType === ChannelTypeEnum.EMAIL) {
      const emailHandler = new EmailHandler(message, provider);
      await emailHandler.send(data);
    } else if (provider.channelType === ChannelTypeEnum.SMS) {
      const smsHandler = new SmsHandler(message, provider);
      await smsHandler.send(data);
    }

    this.eventEmitter.emit('post:send', {
      id: template.id,
      channel: message.channel,
      message,
      triggerPayload: data,
    });
  }

  private getMissingVariables(message: IMessage, data: ITriggerPayload) {
    const variables = this.extractMessageVariables(message);

    const missingVariables: string[] = [];
    for (const variable of variables) {
      if (!_get(data, variable)) {
        missingVariables.push(variable);
      }
    }

    return missingVariables;
  }

  private extractMessageVariables(message: IMessage) {
    const mergedResults: string[] = [];

    if (message.template) {
      mergedResults.push(...getHandlebarsVariables(message.template));
    }
    if (message.subject) {
      mergedResults.push(...getHandlebarsVariables(message.subject));
    }

    const deduplicatedResults = [...new Set(mergedResults)];
    return deduplicatedResults;
  }
}

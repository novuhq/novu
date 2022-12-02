import _get from 'lodash.get';
import { EventEmitter } from 'events';

import { IContentEngine } from '../content/content.engine';

import { EmailHandler } from '../handler/email.handler';
import { SmsHandler } from '../handler/sms.handler';
import { INovuConfig } from '../novu.interface';
import { ProviderStore } from '../provider/provider.store';
import {
  ChannelTypeEnum,
  IMessage,
  ITemplate,
  ITriggerPayload,
} from '../template/template.interface';
import { TemplateStore } from '../template/template.store';
import { ThemeStore } from '../theme/theme.store';
import { ChatHandler } from '../handler/chat.handler';

export class TriggerEngine {
  constructor(
    private templateStore: TemplateStore,
    private providerStore: ProviderStore,
    private themeStore: ThemeStore,
    private contentEngine: IContentEngine,
    private config: INovuConfig,
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
    const provider = message.providerId
      ? await this.providerStore.getProviderById(message.providerId)
      : await this.providerStore.getProviderByChannel(message.channel);

    if (!provider) {
      throw new Error(`Provider for ${message.channel} channel was not found`);
    }

    const missingVariables = this.getMissingVariables(message, data);
    if (missingVariables.length && this.config.variableProtection) {
      throw new Error(
        `Missing variables passed. ${missingVariables.toString()}`
      );
    }

    await this.validate(message, data);

    this.eventEmitter.emit('pre:send', {
      id: template.id,
      channel: message.channel,
      message,
      triggerPayload: data,
    });

    let theme = await this.themeStore.getDefaultTheme();
    if (data.$theme_id) {
      theme = await this.themeStore.getThemeById(data?.$theme_id);
    } else if (template.themeId) {
      theme = await this.themeStore.getThemeById(template.themeId);
    }

    if (provider.channelType === ChannelTypeEnum.EMAIL) {
      const emailHandler = new EmailHandler(message, provider, theme);

      await emailHandler.send(data);
    } else if (provider.channelType === ChannelTypeEnum.SMS) {
      const smsHandler = new SmsHandler(message, provider);

      await smsHandler.send(data);
    } else if (provider.channelType === ChannelTypeEnum.CHAT) {
      const chatHandler = new ChatHandler(message, provider);

      await chatHandler.send(data);
    }

    this.eventEmitter.emit('post:send', {
      id: template.id,
      channel: message.channel,
      message,
      triggerPayload: data,
    });
  }

  private getMissingVariables(message: IMessage, data: ITriggerPayload) {
    const variables = this.extractMessageVariables(message, data);

    const missingVariables: string[] = [];

    for (const variable of variables) {
      if (!_get(data, variable)) {
        missingVariables.push(variable);
      }
    }

    return missingVariables;
  }

  private extractMessageVariables(message: IMessage, data: ITriggerPayload) {
    const mergedResults: string[] = [];

    if (message.template && typeof message.template === 'string') {
      mergedResults.push(
        ...this.contentEngine.extractMessageVariables(message.template)
      );
    }

    if (message.subject) {
      if (typeof message.subject === 'string') {
        mergedResults.push(
          ...this.contentEngine.extractMessageVariables(message.subject)
        );
      } else if (typeof message.subject === 'function') {
        mergedResults.push(
          ...this.contentEngine.extractMessageVariables(message.subject(data))
        );
      } else {
        throw new Error(
          "Subject must be either of 'string' or 'function' type"
        );
      }
    }

    const deduplicatedResults = [...new Set(mergedResults)];

    return deduplicatedResults;
  }

  private async validate(message: IMessage, data: ITriggerPayload) {
    if (!message.validator) {
      return;
    }
    const valid = await message.validator?.validate(data);
    if (!valid) {
      throw new Error(`Payload for ${message.channel} is invalid`);
    }
  }
}

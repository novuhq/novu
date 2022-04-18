import { ChannelTypeEnum, IMessageTemplate } from '@novu/shared';

export class ContentService {
  replaceVariables(content: string, variables: { [key: string]: string }) {
    if (!content) return content;
    let modifiedContent = content;

    for (const key in variables) {
      if (!variables.hasOwnProperty(key)) continue;
      modifiedContent = modifiedContent.replace(new RegExp(`{{${this.escapeForRegExp(key)}}}`, 'g'), variables[key]);
    }

    return modifiedContent;
  }

  extractVariables(content: string): string[] {
    if (!content) return [];

    const regExp = /{{([a-zA-Z_][a-zA-Z0-9_-]*?)}}/gm;
    const matchedItems = content.match(regExp);

    const result = [];
    if (!matchedItems || !Array.isArray(matchedItems)) {
      return result;
    }

    for (const item of matchedItems) {
      result.push(item.replace('{{', '').replace('}}', ''));
    }

    return result;
  }

  extractMessageVariables(messages: IMessageTemplate[]): string[] {
    const variables = [];

    for (const text of this.messagesTextIterator(messages)) {
      const extractedVariables = this.extractVariables(text);

      variables.push(...extractedVariables);
    }

    return Array.from(new Set(variables));
  }

  extractSubscriberMessageVariables(messages: IMessageTemplate[]): string[] {
    const variables = [];

    const hasSmsMessage = !!messages.find((i) => i.type === ChannelTypeEnum.SMS);
    if (hasSmsMessage) {
      variables.push('phone');
    }

    const hasEmailMessage = !!messages.find((i) => i.type === ChannelTypeEnum.EMAIL);
    if (hasEmailMessage) {
      variables.push('email');
    }

    return Array.from(new Set(variables));
  }

  private *messagesTextIterator(messages: IMessageTemplate[]): Generator<string> {
    for (const message of messages) {
      if (message.type === ChannelTypeEnum.IN_APP) {
        yield message.content as string;

        if (message?.cta?.data?.url) {
          yield message.cta.data.url;
        }
      } else if (message.type === ChannelTypeEnum.SMS) {
        yield message.content as string;
      } else if (Array.isArray(message.content)) {
        yield message.subject;

        for (const block of message.content) {
          yield block.url;
          yield block.content;
        }
      } else if (typeof message.content === 'string') {
        yield message.content;
      }
    }
  }

  private escapeForRegExp(content: string) {
    return content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }
}

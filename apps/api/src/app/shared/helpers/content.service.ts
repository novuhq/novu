import {
  StepTypeEnum,
  INotificationTemplateStep,
  getTemplateVariables,
  IMustacheVariable,
  TemplateSystemVariables,
  TemplateVariableTypeEnum,
  DelayTypeEnum,
  IFieldFilterPart,
  FilterPartTypeEnum,
} from '@novu/shared';
import Handlebars from 'handlebars';
import { ApiException } from '../exceptions/api.exception';

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

  extractVariables(content: string): IMustacheVariable[] {
    if (!content) return [];

    try {
      const ast: hbs.AST.Program = Handlebars.parseWithoutProcessing(content);

      return getTemplateVariables(ast.body);
    } catch (e) {
      throw new ApiException('Failed to extract variables');
    }
  }

  extractMessageVariables(messages: INotificationTemplateStep[]): IMustacheVariable[] {
    const variables: IMustacheVariable[] = [];

    for (const text of this.messagesTextIterator(messages)) {
      const extractedVariables = this.extractVariables(text);
      variables.push(...extractedVariables);
    }

    variables.push(...this.extractStepVariables(messages));

    return [
      ...new Map(
        variables.filter((item) => !this.isSystemVariable(item.name)).map((item) => [item.name, item])
      ).values(),
    ];
  }

  extractStepVariables(messages: INotificationTemplateStep[]): IMustacheVariable[] {
    const variables: IMustacheVariable[] = [];

    for (const message of messages) {
      if (message.filters) {
        const filterVariables = message.filters.flatMap((filter) =>
          filter.children
            .filter((item) => item.on === FilterPartTypeEnum.PAYLOAD)
            .map((item: IFieldFilterPart) => {
              return {
                name: item.field,
                type: TemplateVariableTypeEnum.STRING,
              };
            })
        );
        variables.push(...filterVariables);
      }

      if (message.metadata?.type === DelayTypeEnum.SCHEDULED && message.metadata.delayPath) {
        variables.push({ name: message.metadata.delayPath, type: TemplateVariableTypeEnum.STRING });
      }

      if (message.template?.type === StepTypeEnum.DIGEST) {
        if (message.metadata?.digestKey) {
          variables.push({ name: message.metadata.digestKey, type: TemplateVariableTypeEnum.STRING });
        }
      }
    }

    return variables;
  }

  extractSubscriberMessageVariables(messages: INotificationTemplateStep[]): string[] {
    const variables: string[] = [];

    const hasSmsMessage = !!messages.find((i) => i.template?.type === StepTypeEnum.SMS);
    if (hasSmsMessage) {
      variables.push('phone');
    }

    const hasEmailMessage = !!messages.find((i) => i.template?.type === StepTypeEnum.EMAIL);
    if (hasEmailMessage) {
      variables.push('email');
    }

    return Array.from(new Set(variables));
  }

  private *messagesTextIterator(messages: INotificationTemplateStep[]): Generator<string> {
    for (const message of messages) {
      if (!message.template) continue;

      if (message.template?.type === StepTypeEnum.IN_APP) {
        yield message.template.content as string;

        if (message?.template.cta?.data?.url) {
          yield message.template.cta.data.url;
        }
      } else if (message.template?.type === StepTypeEnum.SMS) {
        yield message.template.content as string;
      } else if (message.template?.type === StepTypeEnum.PUSH) {
        yield message.template.content as string;
        yield message.template.title as string;
      } else if (Array.isArray(message.template?.content)) {
        yield message.template.subject || '';

        for (const block of message.template.content) {
          yield block.url || '';
          yield block.content;
        }
      } else if (typeof message.template.content === 'string') {
        yield message.template.content;
      }
    }
  }

  private isSystemVariable(variableName: string): boolean {
    return TemplateSystemVariables.includes(variableName.includes('.') ? variableName.split('.')[0] : variableName);
  }

  private escapeForRegExp(content: string) {
    return content.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  }

  buildMessageVariables(commandPayload: any, subscriberPayload): { [key: string]: any } {
    const messageVariables: { [key: string]: any } = { ...commandPayload };

    return this.combineObjects(messageVariables, subscriberPayload, 'subscriber');
  }

  private combineObjects(
    messageVariables: { [key: string]: any },
    subscriberPayload,
    subscriberString = ''
  ): { [key: string]: any } {
    const newMessageVariables: { [key: string]: any } = { ...messageVariables };

    Object.keys(subscriberPayload).forEach(function (key) {
      const newKey = subscriberString === '' ? key : `${subscriberString}.${key}`;
      newMessageVariables[newKey] = subscriberPayload[key];
    });

    return newMessageVariables;
  }
}

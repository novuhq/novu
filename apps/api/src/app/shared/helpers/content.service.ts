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
  TriggerReservedVariables,
  ReservedVariablesMap,
  TriggerContextTypeEnum,
  ITriggerReservedVariable,
} from '@novu/shared';
import Handlebars from 'handlebars';
import { ApiException } from '../exceptions/api.exception';
import { NotificationStep } from '../../workflows/usecases/create-notification-template';

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

  extractMessageVariables(messages: NotificationStep[]): {
    variables: IMustacheVariable[];
    reservedVariables: ITriggerReservedVariable[];
  } {
    const variables: IMustacheVariable[] = [];
    const reservedVariables: ITriggerReservedVariable[] = [];

    for (const text of this.messagesTextIterator(messages)) {
      const extractedVariables = this.extractVariables(text);
      const extractedReservedVariables = this.extractReservedVariables(extractedVariables);

      reservedVariables.push(...extractedReservedVariables);
      variables.push(...extractedVariables);
    }

    variables.push(...this.extractStepVariables(messages));

    return {
      variables: [
        ...new Map(
          variables.filter((item) => !this.isSystemVariable(item.name)).map((item) => [item.name, item])
        ).values(),
      ],
      reservedVariables: [...new Map(reservedVariables.map((item) => [item.type, item])).values()],
    };
  }

  extractStepVariables(messages: NotificationStep[]): IMustacheVariable[] {
    const variables: IMustacheVariable[] = [];

    for (const message of messages) {
      if (message.filters) {
        const filters = Array.isArray(message.filters) ? message.filters : [];
        const filteredVariables = filters.flatMap((filter) => {
          const filteredChildren = filter.children?.filter((item) => item.on === FilterPartTypeEnum.PAYLOAD) || [];
          const mappedChildren = filteredChildren.map((item: IFieldFilterPart) => {
            return {
              name: item.field,
              type: TemplateVariableTypeEnum.STRING,
            };
          });

          return mappedChildren;
        });
        variables.push(...filteredVariables);
      }

      if (message.metadata?.type === DelayTypeEnum.SCHEDULED && message.metadata.delayPath) {
        variables.push({ name: message.metadata.delayPath, type: TemplateVariableTypeEnum.STRING });
      }

      if (message.template?.type === StepTypeEnum.DIGEST) {
        if (message.metadata && 'digestKey' in message.metadata && message.metadata.digestKey) {
          variables.push({ name: message.metadata.digestKey, type: TemplateVariableTypeEnum.STRING });
        }
      }
    }

    return variables;
  }

  extractReservedVariables(variables: IMustacheVariable[]): ITriggerReservedVariable[] {
    const reservedVariables: ITriggerReservedVariable[] = [];

    const reservedVariableTypes = variables
      .filter((item) => this.isReservedVariable(item.name))
      .map((item) => this.getVariableNamePrefix(item.name));

    const triggerContextTypes = Array.from(new Set(reservedVariableTypes)) as TriggerContextTypeEnum[];

    triggerContextTypes.forEach((variable) => {
      reservedVariables.push({ type: variable, variables: ReservedVariablesMap[variable] });
    });

    return reservedVariables;
  }

  extractSubscriberMessageVariables(messages: NotificationStep[]): string[] {
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

  private *messagesTextIterator(messages: NotificationStep[]): Generator<string> {
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
    return TemplateSystemVariables.includes(this.getVariableNamePrefix(variableName));
  }

  private getVariableNamePrefix(variableName: string): string {
    return variableName.includes('.') ? variableName.split('.')[0] : variableName;
  }

  private isReservedVariable(variableName: string): boolean {
    return TriggerReservedVariables.includes(this.getVariableNamePrefix(variableName));
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

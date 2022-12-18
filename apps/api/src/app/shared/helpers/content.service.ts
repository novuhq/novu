/* eslint-disable @typescript-eslint/no-explicit-any */
import { StepTypeEnum, INotificationTemplateStep } from '@novu/shared';
import Handlebars from 'handlebars';

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

    try {
      const ast: hbs.AST.Program = Handlebars.parse(content);

      return this.getHandlebarVariables(ast.body);
    } catch (e) {
      return [];
    }
  }

  extractMessageVariables(messages: INotificationTemplateStep[]): string[] {
    const variables = [];

    for (const text of this.messagesTextIterator(messages)) {
      const extractedVariables = this.extractVariables(text);
      variables.push(...extractedVariables);
    }

    return Array.from(new Set(variables));
  }

  extractSubscriberMessageVariables(messages: INotificationTemplateStep[]): string[] {
    const variables = [];

    const hasSmsMessage = !!messages.find((i) => i.template.type === StepTypeEnum.SMS);
    if (hasSmsMessage) {
      variables.push('phone');
    }

    const hasEmailMessage = !!messages.find((i) => i.template.type === StepTypeEnum.EMAIL);
    if (hasEmailMessage) {
      variables.push('email');
    }

    return Array.from(new Set(variables));
  }

  private *messagesTextIterator(messages: INotificationTemplateStep[]): Generator<string> {
    for (const message of messages) {
      if (message.template.type === StepTypeEnum.IN_APP) {
        yield message.template.content as string;

        if (message?.template.cta?.data?.url) {
          yield message.template.cta.data.url;
        }
      } else if (message.template.type === StepTypeEnum.SMS) {
        yield message.template.content as string;
      } else if (Array.isArray(message.template.content)) {
        yield message.template.subject;

        for (const block of message.template.content) {
          yield block.url;
          yield block.content;
        }
      } else if (typeof message.template.content === 'string') {
        yield message.template.content;
      }
    }
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

    Object.keys(subscriberPayload).map(function (key) {
      const newKey = subscriberString === '' ? key : `${subscriberString}.${key}`;
      newMessageVariables[newKey] = subscriberPayload[key];
    });

    return newMessageVariables;
  }

  private getHandlebarVariables(input: hbs.AST.Statement[]): string[] {
    const moustacheVariables = input
      .filter(({ type }: hbs.AST.Statement) => type === 'MustacheStatement')
      .map((statement: hbs.AST.Statement) => {
        const moustacheStatement: hbs.AST.MustacheStatement = statement as hbs.AST.MustacheStatement;
        const paramsExpressionList = moustacheStatement.params as hbs.AST.PathExpression[];
        const pathExpression = moustacheStatement.path as hbs.AST.PathExpression;

        return paramsExpressionList[0]?.original || pathExpression.original;
      });

    const blockVariables = input
      .filter(({ type }: hbs.AST.Statement) => type === 'BlockStatement')
      .map((statement: hbs.AST.Statement) => {
        const blockStatement: hbs.AST.BlockStatement = statement as hbs.AST.BlockStatement;
        const paramsExpressionList = blockStatement.params as hbs.AST.PathExpression[];
        const pathExpression = blockStatement.path as hbs.AST.PathExpression;
        let blockName = paramsExpressionList[0]?.original || pathExpression.original;
        const nested = this.getHandlebarVariables(blockStatement.program.body);
        if (['each', 'with'].includes(pathExpression.original)) {
          nested.forEach((name, ind) => {
            nested[ind] = `${blockName}.${name}`;
          });
          blockName = `${blockName}[]`;
        }

        return [blockName, ...nested];
      })
      .flat();

    return moustacheVariables.concat(blockVariables);
  }
}

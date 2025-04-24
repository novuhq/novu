import { Injectable } from '@nestjs/common';
import { JSONContent as MailyJSONContent } from '@maily-to/render';

import { WrapMailyInLiquidCommand } from './wrap-maily-in-liquid.command';
import { MailyContentTypeEnum, MAILY_FIRST_CITIZEN_VARIABLE_KEY } from '../../../../shared/helpers/maily.types';
import { hasAttrs, hasMarks, variableAttributeConfig } from '../../../../shared/helpers/maily-utils';

/**
 * Enriches Maily JSON content with Liquid syntax.
 *
 * @example
 * Input:
 * {
 *   type: "repeat",
 *   attrs: { each: "payload.comments" },
 *   content: [{
 *     type: "variable",
 *     attrs: { id: "payload.comments.name" }
 *   }]
 * },
 * {
 *   type: "variable",
 *   attrs: { id: "payload.test" }
 * }
 *
 * Output:
 * {
 *   type: "paragraph",
 *   attrs: { each: "{{ payload.comments }}" },
 *   content: [{
 *     type: "variable",
 *     text: "{{ payload.comments.name }}"
 *   }]
 * },
 * {
 *   type: "variable",
 *   text: "{{ payload.test }}"
 * }
 */
@Injectable()
export class WrapMailyInLiquidUseCase {
  execute(command: WrapMailyInLiquidCommand): MailyJSONContent {
    const mailyJSONContent: MailyJSONContent = JSON.parse(command.emailEditor);

    return this.wrapVariablesInLiquid(mailyJSONContent);
  }

  private wrapVariablesInLiquid(node: MailyJSONContent): MailyJSONContent {
    const newNode = { ...node } as MailyJSONContent & { attrs: Record<string, any> };

    if (node.content) {
      newNode.content = node.content.map((child) => this.wrapVariablesInLiquid(child));
    }

    if (hasAttrs(node)) {
      newNode.attrs = this.processVariableNodeAttributes(node);
    }

    if (hasMarks(node)) {
      newNode.marks = this.processNodeMarks(node);
    }

    return newNode;
  }

  private processVariableNodeAttributes(node: MailyJSONContent & { attrs: Record<string, string> }) {
    const { attrs, type } = node;
    const config = variableAttributeConfig(type as MailyContentTypeEnum);
    const processedAttrs = { ...attrs };

    config.forEach(({ attr, flag }) => {
      const attrValue = attrs[attr];
      const flagValue = attrs[flag];
      const { fallback, aliasFor } = attrs;

      if (!flagValue || !attrValue) {
        return;
      }

      processedAttrs[attr] = this.wrapInLiquidOutput(attrValue, fallback, aliasFor);

      if (!MAILY_FIRST_CITIZEN_VARIABLE_KEY.includes(flag)) {
        processedAttrs[flag] = false;
      }
    });

    return processedAttrs;
  }

  private processNodeMarks(node: MailyJSONContent & { marks: Record<string, any>[] }) {
    return node.marks.map((mark) => {
      if (!mark.attrs) {
        return mark;
      }

      const { attrs } = mark;
      const processedMark = {
        ...mark,
        attrs: { ...attrs },
      };

      const config = variableAttributeConfig(mark.type as MailyContentTypeEnum);

      config.forEach(({ attr, flag }) => {
        const attrValue = attrs[attr];
        const flagValue = attrs[flag];
        const { fallback } = attrs;

        if (!flagValue || !attrValue || typeof attrValue !== 'string') {
          return;
        }

        processedMark.attrs[attr] = this.wrapInLiquidOutput(attrValue, fallback);

        if (!MAILY_FIRST_CITIZEN_VARIABLE_KEY.includes(flag)) {
          processedMark.attrs[flag] = false;
        }
      });

      return processedMark;
    });
  }

  private wrapInLiquidOutput(variableName: string, fallback?: string, aliasFor?: string): string {
    const actualVariableName = aliasFor || variableName;
    const fallbackSuffix = fallback ? ` | default: '${fallback}'` : '';

    return `{{ ${actualVariableName}${fallbackSuffix} }}`;
  }
}

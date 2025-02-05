/* eslint-disable no-param-reassign */
import { Injectable } from '@nestjs/common';
import { JSONContent as MailyJSONContent } from '@maily-to/render';
import { WrapMailyInLiquidCommand } from './wrap-maily-in-liquid.command';
import {
  MailyContentTypeEnum,
  MailyAttrsEnum,
  MAILY_ITERABLE_MARK,
  MAILY_FIRST_CITIZEN_VARIABLE_KEY,
} from './maily.types';

/**
 * Enriches Maily JSON content with Liquid syntax for variables.
 *
 * @example
 * Input:
 * {
 *   type: "for",
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
 *   attrs: { each: "{{ payload.comments[0] }}" },
 *   content: [{
 *     type: "variable",
 *     text: "{{ payload.comments[0].name }}"
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

  private wrapVariablesInLiquid(node: MailyJSONContent, parentForLoopKey?: string): MailyJSONContent {
    const newNode = { ...node } as MailyJSONContent & { attrs: Record<string, any> };

    // if this is a for loop node, track its variable
    if (this.isForNode(node)) {
      parentForLoopKey = node.attrs[MailyAttrsEnum.EACH_KEY];
    }

    if (node.content) {
      newNode.content = node.content.map((child) => this.wrapVariablesInLiquid(child, parentForLoopKey));
    }

    if (this.hasAttrs(node)) {
      newNode.attrs = this.processVariableNodeAttributes(node, parentForLoopKey);
    }

    if (this.hasMarks(node)) {
      newNode.marks = this.processNodeMarks(node);
    }

    return newNode;
  }

  private processVariableNodeAttributes(
    node: MailyJSONContent & { attrs: Record<string, string> },
    parentForLoopKey?: string
  ) {
    const { attrs, type } = node;
    const config = variableAttributeConfig(type as MailyContentTypeEnum);
    const processedAttrs = { ...attrs };

    config.forEach(({ attr, flag }) => {
      const attrValue = attrs[attr];
      const flagValue = attrs[flag];

      if (!flagValue || !attrValue) {
        return;
      }

      let processedValue = attrValue;

      // add special indicator for attributes that belong to the for loop and to the for loop itself
      if (parentForLoopKey && processedValue.startsWith(`${parentForLoopKey}`)) {
        processedValue = processedValue.replace(`${parentForLoopKey}`, `${parentForLoopKey}[${MAILY_ITERABLE_MARK}]`);
      }

      processedAttrs[attr] = this.wrapInLiquidOutput(processedValue, attrs.fallback);

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

  private wrapInLiquidOutput(variableName: string, fallback?: string): string {
    const fallbackSuffix = fallback ? ` | default: '${fallback}'` : '';

    return `{{ ${variableName}${fallbackSuffix} }}`;
  }

  private hasAttrs(node: MailyJSONContent): node is MailyJSONContent & { attrs: Record<string, any> } {
    return !!node.attrs;
  }

  private hasMarks(node: MailyJSONContent): node is MailyJSONContent & { marks: Record<string, any>[] } {
    return !!node.marks;
  }

  private isForNode(
    node: MailyJSONContent
  ): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } } {
    return !!(
      node.type === MailyContentTypeEnum.FOR &&
      node.attrs &&
      node.attrs[MailyAttrsEnum.EACH_KEY] !== undefined &&
      typeof node.attrs[MailyAttrsEnum.EACH_KEY] === 'string'
    );
  }
}

const variableAttributeConfig = (type: MailyContentTypeEnum) => {
  const commonConfig = [
    /*
     * Maily Variable Map
     * * maily_id equals to maily_variable
     * * https://github.com/arikchakma/maily.to/blob/ebcf233eb1d4b16fb568fb702bf0756678db38d0/packages/render/src/maily.tsx#L787
     */
    { attr: MailyAttrsEnum.ID, flag: MailyAttrsEnum.ID },
    /*
     * showIfKey is always a maily_variable
     */
    { attr: MailyAttrsEnum.SHOW_IF_KEY, flag: MailyAttrsEnum.SHOW_IF_KEY },
    { attr: MailyAttrsEnum.EACH_KEY, flag: MailyAttrsEnum.EACH_KEY },
  ];

  if (type === MailyContentTypeEnum.BUTTON) {
    return [
      { attr: MailyAttrsEnum.TEXT, flag: MailyAttrsEnum.IS_TEXT_VARIABLE },
      { attr: MailyAttrsEnum.URL, flag: MailyAttrsEnum.IS_URL_VARIABLE },
      ...commonConfig,
    ];
  }

  if (type === MailyContentTypeEnum.IMAGE) {
    return [
      { attr: MailyAttrsEnum.SRC, flag: MailyAttrsEnum.IS_SRC_VARIABLE },
      {
        attr: MailyAttrsEnum.EXTERNAL_LINK,
        flag: MailyAttrsEnum.IS_EXTERNAL_LINK_VARIABLE,
      },
      ...commonConfig,
    ];
  }

  if (type === MailyContentTypeEnum.LINK) {
    return [{ attr: MailyAttrsEnum.HREF, flag: MailyAttrsEnum.IS_URL_VARIABLE }, ...commonConfig];
  }

  return commonConfig;
};

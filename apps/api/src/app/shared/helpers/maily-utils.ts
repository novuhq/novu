import { JSONContent as MailyJSONContent } from '@maily-to/render';

import { MailyAttrsEnum, MailyContentTypeEnum } from './maily.types';
import { Variable } from '../../workflows-v2/util/template-parser/liquid-parser';

export const isRepeatNode = (
  node: MailyJSONContent
): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } } => {
  return !!(
    (node.type === MailyContentTypeEnum.REPEAT || node.type === MailyContentTypeEnum.FOR) &&
    node.attrs &&
    node.attrs[MailyAttrsEnum.EACH_KEY] !== undefined &&
    typeof node.attrs[MailyAttrsEnum.EACH_KEY] === 'string'
  );
};

export const isVariableNode = (
  node: MailyJSONContent
): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.ID]: string } } => {
  return !!(
    node.type === MailyContentTypeEnum.VARIABLE &&
    node.attrs &&
    node.attrs[MailyAttrsEnum.ID] !== undefined &&
    typeof node.attrs[MailyAttrsEnum.ID] === 'string'
  );
};

export const hasShow = (
  node: MailyJSONContent
): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } } => {
  return node.attrs?.[MailyAttrsEnum.SHOW_IF_KEY] !== undefined && node.attrs?.[MailyAttrsEnum.SHOW_IF_KEY] !== null;
};

export const hasAttrs = (node: MailyJSONContent): node is MailyJSONContent & { attrs: Record<string, any> } => {
  return !!node.attrs;
};

export const hasMarks = (node: MailyJSONContent): node is MailyJSONContent & { marks: Record<string, any>[] } => {
  return !!node.marks;
};

export const variableAttributeConfig = (type: MailyContentTypeEnum) => {
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

const processVariableNodeAttributes = ({
  node,
  shouldNotProcess,
  processAttr,
}: {
  node: MailyJSONContent & { attrs: Record<string, string> };
  shouldNotProcess: (attrValue: string) => boolean;
  processAttr: (attrValue: string) => string;
}) => {
  const { attrs, type } = node;
  const config = variableAttributeConfig(type as MailyContentTypeEnum);
  const processedAttrs = { ...attrs };

  config.forEach(({ attr, flag }) => {
    const attrValue = attrs[attr];
    const flagValue = attrs[flag];

    if (!flagValue || !attrValue || typeof attrValue !== 'string' || shouldNotProcess(attrValue)) {
      return;
    }

    processedAttrs[attr] = processAttr(attrValue);
  });

  return processedAttrs;
};

const processNodeMarks = ({
  node,
  shouldNotProcess,
  processAttr,
}: {
  node: MailyJSONContent & { marks: Record<string, any>[] };
  shouldNotProcess: (attrValue: string) => boolean;
  processAttr: (attrValue: string) => string;
}) => {
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

      if (!flagValue || !attrValue || typeof attrValue !== 'string' || shouldNotProcess(attrValue)) {
        return;
      }

      processedMark.attrs[attr] = processAttr(attrValue);
    });

    return processedMark;
  });
};

const replaceVariable = (node: MailyJSONContent, variableToReplace: string, replacement: string): MailyJSONContent => {
  const newNode = { ...node } as MailyJSONContent & { attrs: Record<string, any> };

  if (node.content) {
    newNode.content = node.content.map((child) => replaceVariable(child, variableToReplace, replacement));
  }

  if (hasAttrs(node)) {
    newNode.attrs = processVariableNodeAttributes({
      node,
      shouldNotProcess: (attrValue) => attrValue !== variableToReplace,
      processAttr: () => replacement,
    });
  }

  if (hasMarks(node)) {
    newNode.marks = processNodeMarks({
      node,
      shouldNotProcess: (attrValue) => attrValue !== variableToReplace,
      processAttr: () => replacement,
    });
  }

  return newNode;
};

export const replaceMailyVariables = (content: string, variableToReplace: string, replacement: string) => {
  const mailyJSONContent: MailyJSONContent = JSON.parse(content);

  return replaceVariable(mailyJSONContent, variableToReplace, replacement);
};

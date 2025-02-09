import { JSONContent as MailyJSONContent } from '@maily-to/render';

import { MailyAttrsEnum, MailyContentTypeEnum } from './maily.types';

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

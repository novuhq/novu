/* eslint-disable no-param-reassign */
import { TipTapNode } from '@novu/shared';
import { ExpendEmailEditorSchemaCommand, TipTapSchema } from './expend-email-editor-schema-command';

// Rename the class to ExpendEmailEditorSchemaUseCase
export class ExpandEmailEditorSchemaUsecase {
  execute(command: ExpendEmailEditorSchemaCommand): TipTapNode {
    const schema = JSON.parse(command.schema);
    const tiptapSchema: TipTapNode = TipTapSchema.parse(schema);
    augmentNode(tiptapSchema);

    return tiptapSchema;
  }
}

function hasEach(node: TipTapNode): node is TipTapNode & { attr: { each: string } } {
  return !!(node.attr && 'each' in node.attr);
}

function hasShow(node: TipTapNode): node is TipTapNode & { attr: { show: string } } {
  return !!(node.attr && 'show' in node.attr);
}

function augmentNode(node: TipTapNode): TipTapNode {
  if (hasEach(node)) {
    return expendedForEach(node);
  }
  if (hasShow(node)) {
    return expendedShow(node);
  }
  if (node.content) {
    node.content = node.content.map(augmentNode);
  }

  return node;
}

function enrichContent(templateContent: TipTapNode[], value: { [p: string]: string }) {
  return undefined;
}

function expendedForEach(node: TipTapNode & { attr: { each: string } }): TipTapNode {
  const { each } = node.attr;
  const templateContent = node.content || [];
  const expandedContent: TipTapNode[] = [];
  const jsonArrOfValues: [{ [key: string]: string }] = JSON.parse(each);
  for (const value of jsonArrOfValues) {
    expandedContent.push({ type: node.type, content: replacePlaceholders(templateContent, value) });
  }

  return { ...node, content: expandedContent };
}
function expendedShow(node: TipTapNode & { attr: { show: string } }): TipTapNode {}
type PayloadObject = {
  [key: string]: string | boolean | number | PayloadObject;
};

function replacePlaceholders(nodes: TipTapNode[], payload: PayloadObject): TipTapNode[] {
  return nodes.map((node) => {
    const newNode: TipTapNode = { ...node };

    if (newNode.text) {
      newNode.text = replaceTextPlaceholders(newNode.text, payload);
    }

    if (newNode.content) {
      newNode.content = replacePlaceholders(newNode.content, payload);
    }

    return newNode;
  });
}

function getValueFromPayload(key: string, payload: PayloadObject): string | undefined {
  const keys = key.split('.');
  let value: any = payload;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return undefined;
    }
  }

  return String(value);
}

function replaceTextPlaceholders(text: string, payload: PayloadObject): string {
  return text.replace(/{%item\.(\w+(\.\w+)*)%}/g, (match, key) => {
    const value = getValueFromPayload(key, payload);

    return value !== undefined ? value : match;
  });
}

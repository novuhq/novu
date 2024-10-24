/* eslint-disable no-param-reassign */
import { TipTapNode } from '@novu/shared';
import { z } from 'zod';
import { ExpendEmailEditorSchemaCommand } from './expend-email-editor-schema-command';

export const TipTapSchema = z
  .object({
    type: z.string(),
    content: z.array(z.lazy(() => TipTapSchema)).optional(),
    text: z.string().optional(),
    attr: z.record(z.unknown()).optional(),
  })
  .strict();

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
  return !!(node.attrs && 'each' in node.attrs);
}

function hasShow(node: TipTapNode): node is TipTapNode & { attr: { show: string } } {
  return !!(node.attrs && 'show' in node.attrs);
}

function augmentNode(node: TipTapNode): TipTapNode {
  if (hasShow(node)) {
    return expendedShow(node);
  }
  if (hasEach(node)) {
    return expendedForEach(node);
  }
  if (node.content) {
    node.content = node.content.map(augmentNode);
  }

  return removeEmptyContentNodes(node);
}

function removeEmptyContentNodes(node: TipTapNode): TipTapNode {
  const nodes = node.content;
  if (!nodes) {
    return node;
  }
  const tipTapNodes = nodes
    .map((innerNode) => {
      let newNode: TipTapNode = { ...innerNode };

      if (newNode.content) {
        newNode = removeEmptyContentNodes(newNode);
      }

      return newNode;
    })
    .filter((innerNode) => (innerNode.content && innerNode.content?.length > 0) || node.text !== undefined);

  return { ...node, content: tipTapNodes };
}

type PayloadObject = {
  [key: string]: string | boolean | number | PayloadObject;
};

function getEachAsJsonObject(node: TipTapNode & { attrs: { each: string } }) {
  const { each } = node.attrs;

  const correctedJsonString: string = each.replace(/'/g, '"').replace(/(\w+):/g, '"$1":');

  return JSON.parse(correctedJsonString);
}

function expendedForEach(node: TipTapNode & { attr: { each: string } }): TipTapNode {
  const eachObject = getEachAsJsonObject(node);
  if (!Array.isArray(eachObject) || eachObject.length === 0) {
    return node;
  }

  const templateContent = node.content || [];

  const expandedContent: TipTapNode[] = [];
  const jsonArrOfValues = eachObject as unknown as [{ [key: string]: string }];

  for (const value of jsonArrOfValues) {
    const hydratedContent = replacePlaceholders(templateContent, value);
    expandedContent.push(...hydratedContent);
  }

  return { ...node, content: expandedContent, attrs: {} };
}

function expendedShow(node: TipTapNode & { attrs: { show: string } }): TipTapNode {
  const { show } = node.attrs;
  const conditionalContent = node.content || [];

  let finalContent: TipTapNode[];
  if (stringToBoolean(show)) {
    finalContent = conditionalContent;
  } else {
    finalContent = [];
  }

  return { ...node, content: finalContent };
}

function stringToBoolean(value: string): boolean {
  // Convert the string to lowercase and check if it equals "true"
  return value.toLowerCase() === 'true';
}

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

  for (const innerKey of keys) {
    if (value && typeof value === 'object' && innerKey in value) {
      value = value[innerKey];
    } else {
      return undefined;
    }
  }

  return String(value);
}

function replaceTextPlaceholders(text: string, payload: PayloadObject): string {
  console.log('DEBUG: Input text:', text);
  console.log('DEBUG: Payload object:', payload);

  return text.replace(/{[%#]item\.(\w+(\.\w+)*)[%#]}/g, (match, key) => {
    console.log('DEBUG: Match found:', match);
    console.log('DEBUG: Extracted key:', key);

    const value = getValueFromPayload(key, payload);
    console.log('DEBUG: Retrieved value from payload:', value);

    return value !== undefined ? value : match;
  });
}

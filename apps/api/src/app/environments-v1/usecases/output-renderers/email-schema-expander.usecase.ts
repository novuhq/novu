/* eslint-disable no-param-reassign */
import { TipTapNode } from '@novu/shared';
import { z } from 'zod';
import { ExpendEmailEditorSchemaCommand } from './expend-email-editor-schema-command';

export const TipTapSchema = z.object({
  type: z.string().optional(),
  content: z.array(z.lazy(() => TipTapSchema)).optional(),
  text: z.string().optional(),
  attrs: z.record(z.unknown()).optional(),
});

// Rename the class to ExpendEmailEditorSchemaUseCase
export class ExpandEmailEditorSchemaUsecase {
  execute(command: ExpendEmailEditorSchemaCommand): TipTapNode {
    augmentNode(command.schema);

    return command.schema;
  }
}

function hasEach(node: TipTapNode): node is TipTapNode & { attrs: { each: unknown } } {
  return !!(node.attrs && 'each' in node.attrs && typeof node.attrs.each === 'object');
}

function hasShow(node: TipTapNode): node is TipTapNode & { attrs: { show: string } } {
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
    node.content = node.content.map(augmentNode).filter((innerNode) => innerNode);
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

function expendedForEach(node: TipTapNode & { attrs: { each: unknown } }): TipTapNode {
  const eachObject = node.attrs.each;
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

function isNodeAVariable(newNode: TipTapNode): newNode is TipTapNode & { attrs: { id: string } } {
  return newNode.type === 'payloadValue' && newNode.attrs?.id !== undefined;
}

function replacePlaceholders(nodes: TipTapNode[], payload: PayloadObject): TipTapNode[] {
  return nodes.map((node) => {
    const newNode: TipTapNode = { ...node };

    if (isNodeAVariable(newNode)) {
      newNode.text = getValueByPath(payload, newNode.attrs.id);
      newNode.type = 'text';
    } else if (newNode.content) {
      newNode.content = replacePlaceholders(newNode.content, payload);
    }

    return newNode;
  });
}
function getValueByPath(obj: Record<string, any>, path: string): any {
  const keys = path.split('.');

  return keys.reduce((currentObj, key) => {
    if (currentObj && typeof currentObj === 'object' && key in currentObj) {
      return currentObj[key];
    }

    return undefined;
  }, obj);
}

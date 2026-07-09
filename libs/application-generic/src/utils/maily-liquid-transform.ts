import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import { Liquid } from 'liquidjs';
import { MailyAttrsEnum } from '../types/maily.types';
import { hasShow, isButtonNode, isImageNode, isLinkNode, isRepeatNode, isVariableNode } from './maily-utils';

type MailyJSONMarks = NonNullable<MailyJSONContent['marks']>[number];

type ShowNode = MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } };
type EachNode = MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } };

/**
 * Transforms a liquid-wrapped Maily tree in place: evaluates `showIfKey` conditions,
 * multiplies `repeat`/`each` nodes by their iterable (adding array indices to liquid
 * expressions), and converts `variable` nodes to text nodes so liquid can resolve them.
 *
 * Extracted from EmailOutputRendererUsecase so channel renderers (email, chat) share
 * the exact same semantics; parameterized on the caller's Liquid engine.
 */
export async function transformMailyContent(
  node: MailyJSONContent,
  variables: Record<string, unknown>,
  liquidEngine: Liquid,
  parent?: MailyJSONContent
): Promise<MailyJSONContent> {
  const queue: Array<{ node: MailyJSONContent; parent?: MailyJSONContent }> = [{ node, parent }];

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (hasShow(current.node)) {
      const shouldShow = await handleShowNode(current.node, variables, liquidEngine, current.parent);

      if (!shouldShow) {
        continue;
      }
    }

    if (isRepeatNode(current.node)) {
      await handleEachNode(current.node, variables, liquidEngine, current.parent);
    }

    if (isVariableNode(current.node)) {
      processVariableNodeTypes(current.node);
    }

    if (current.node.content) {
      for (const childNode of current.node.content) {
        queue.push({ node: childNode, parent: current.node });
      }
    }
  }

  return node;
}

async function handleShowNode(
  node: ShowNode,
  variables: Record<string, unknown>,
  liquidEngine: Liquid,
  parent?: MailyJSONContent
): Promise<boolean> {
  const shouldShow = await evaluateShowCondition(variables, liquidEngine, node);
  if (!shouldShow && parent?.content) {
    parent.content = parent.content.filter((pNode) => pNode !== node);
  }

  delete (node.attrs as Record<string, string>)[MailyAttrsEnum.SHOW_IF_KEY];

  return shouldShow;
}

async function handleEachNode(
  node: EachNode,
  variables: Record<string, unknown>,
  liquidEngine: Liquid,
  parent?: MailyJSONContent
): Promise<void> {
  const newContent = await multiplyForEachNode(node, variables, liquidEngine);

  if (parent?.content) {
    const nodeIndex = parent.content.indexOf(node);
    parent.content = [...parent.content.slice(0, nodeIndex), ...newContent, ...parent.content.slice(nodeIndex + 1)];
  } else {
    node.content = newContent;
  }
}

async function evaluateShowCondition(
  variables: Record<string, unknown>,
  liquidEngine: Liquid,
  node: ShowNode
): Promise<boolean> {
  const { [MailyAttrsEnum.SHOW_IF_KEY]: showIfKey } = node.attrs;
  const parsedShowIfValue = await liquidEngine.parseAndRender(showIfKey, variables);

  return stringToBoolean(parsedShowIfValue);
}

function processVariableNodeTypes(node: MailyJSONContent) {
  node.type = 'text'; // set 'variable' to 'text' to for Liquid to recognize it
  node.text = node.attrs?.id || '';
}

/**
 * For 'each' node, multiply the content by the number of items in the iterable array
 * and add indexes to the placeholders. If iterations attribute is set, limits the number
 * of iterations to that value, otherwise renders all items.
 *
 * @example
 * node:
 * {
 *   type: 'each',
 *   attrs: {
 *     each: '{{ payload.comments }}',
 *     iterations: 2 // Optional - limits to first 2 items only
 *   },
 *   content: [
 *     { type: 'variable', text: '{{ payload.comments.author }}' }
 *   ]
 * }
 *
 * variables:
 * { payload: { comments: [{ author: 'John Doe' }, { author: 'Jane Doe' }] } }
 *
 * result:
 * [
 *   { type: 'text', text: '{{ payload.comments[0].author }}' },
 *   { type: 'text', text: '{{ payload.comments[1].author }}' }
 * ]
 *
 */
async function multiplyForEachNode(
  node: EachNode,
  variables: Record<string, unknown>,
  liquidEngine: Liquid
): Promise<MailyJSONContent[]> {
  const iterablePath = node.attrs[MailyAttrsEnum.EACH_KEY];
  const iterations = node.attrs[MailyAttrsEnum.ITERATIONS_KEY];
  const forEachNodes = node.content || [];
  const iterableArray = await getIterableArray(iterablePath, variables, liquidEngine);
  const limitedIterableArray = iterations ? iterableArray.slice(0, iterations) : iterableArray;

  return limitedIterableArray.flatMap((_, index) => processForEachNodes(forEachNodes, iterablePath, index));
}

async function getIterableArray(
  iterablePath: string,
  variables: Record<string, unknown>,
  liquidEngine: Liquid
): Promise<unknown[]> {
  // evalValue returns the real JS array; avoids a lossy " <-> ' JSON round-trip that
  // breaks on apostrophes in string values (e.g. digest events with `John's order`).
  const cleanPath = iterablePath.replace(/\{\{|\}\}/g, '').trim();

  let value: unknown;
  try {
    value = await liquidEngine.evalValue(cleanPath, variables);
  } catch (error) {
    throw new Error(
      `Failed to resolve iterable value for "${iterablePath}": ${error instanceof Error ? error.message : String(error)}`
    );
  }

  if (!Array.isArray(value)) {
    throw new Error(`Iterable "${iterablePath}" is not an array`);
  }

  return value;
}

function processForEachNodes(
  nodes: MailyJSONContent[],
  iterablePath: string,
  index: number
): Array<MailyJSONContent | MailyJSONMarks> {
  return nodes.map((node) => {
    const processedNode = structuredClone(node);

    if (isVariableNode(processedNode)) {
      processVariableNodeTypes(processedNode);
      if (processedNode.text) {
        processedNode.text = addIndexToLiquidExpression(processedNode.text, iterablePath, index);
      }

      return processedNode;
    }

    if (isButtonNode(processedNode)) {
      if (processedNode.attrs?.text) {
        processedNode.attrs.text = addIndexToLiquidExpression(processedNode.attrs.text, iterablePath, index);
      }

      if (processedNode.attrs?.url) {
        processedNode.attrs.url = addIndexToLiquidExpression(processedNode.attrs.url, iterablePath, index);
      }

      return processedNode;
    }

    if (isImageNode(processedNode)) {
      if (processedNode.attrs?.src) {
        processedNode.attrs.src = addIndexToLiquidExpression(processedNode.attrs.src, iterablePath, index);
      }

      if (processedNode.attrs?.externalLink) {
        processedNode.attrs.externalLink = addIndexToLiquidExpression(
          processedNode.attrs.externalLink,
          iterablePath,
          index
        );
      }

      return processedNode;
    }

    if (isLinkNode(processedNode)) {
      if (processedNode.attrs?.href) {
        processedNode.attrs.href = addIndexToLiquidExpression(processedNode.attrs.href, iterablePath, index);
      }

      return processedNode;
    }

    if (processedNode.content?.length) {
      processedNode.content = processForEachNodes(processedNode.content, iterablePath, index);
    }

    if (processedNode.marks?.length) {
      processedNode.marks = processForEachNodes(processedNode.marks, iterablePath, index) as Array<MailyJSONMarks>;
    }

    return processedNode;
  });
}

/**
 * Add the index to the liquid expression if it doesn't already have an array index
 *
 * @example
 * text: '{{ payload.comments.author }}'
 * iterablePath: '{{ payload.comments }}'
 * index: 0
 * result: '{{ payload.comments[0].author }}'
 */
function addIndexToLiquidExpression(text: string, iterablePath: string, index: number): string {
  const cleanPath = iterablePath.replace(/\{\{|\}\}/g, '').trim();
  const liquidMatch = text.match(/\{\{\s*(.*?)\s*\}\}/);

  if (!liquidMatch) return text;

  const [path, ...filters] = liquidMatch[1].split('|').map((part) => part.trim());
  if (path.includes('[')) return text;

  const newPath = path.replace(cleanPath, `${cleanPath}[${index}]`);

  return filters.length ? `{{ ${newPath} | ${filters.join(' | ')} }}` : `{{ ${newPath} }}`;
}

export function stringToBoolean(value: string): boolean {
  const normalized = value.toLowerCase().trim();
  if (normalized === 'false' || normalized === 'null' || normalized === 'undefined') return false;

  try {
    return Boolean(JSON.parse(normalized));
  } catch {
    return Boolean(normalized);
  }
}

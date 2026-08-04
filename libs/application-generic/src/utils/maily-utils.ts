import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import { TRANSLATION_KEY_SINGLE_REGEX } from '@novu/shared';
import { Liquid } from 'liquidjs';
import { MAILY_FIRST_CITIZEN_VARIABLE_KEY, MailyAttrsEnum, MailyContentTypeEnum } from '../types/maily.types';

type MailyJSONMarks = NonNullable<MailyJSONContent['marks']>[number];

export const isStringifiedMailyJSONContent = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;

  try {
    const parsed = JSON.parse(value);

    return isObjectMailyJSONContent(parsed);
  } catch {
    return false;
  }
};

export const isObjectMailyJSONContent = (value: unknown): value is MailyJSONContent => {
  if (!value || typeof value !== 'object') return false;

  const doc = value as MailyJSONContent;
  if (doc.type !== 'doc' || !Array.isArray(doc.content)) return false;

  return true;
};

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

export const isButtonNode = (
  node: MailyJSONContent
): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.ID]: string } } => {
  return !!(
    node.type === MailyContentTypeEnum.BUTTON &&
    node.attrs &&
    ((node.attrs[MailyAttrsEnum.TEXT] !== undefined && typeof node.attrs[MailyAttrsEnum.TEXT] === 'string') ||
      (node.attrs[MailyAttrsEnum.URL] !== undefined && typeof node.attrs[MailyAttrsEnum.URL] === 'string'))
  );
};

export const isImageNode = (
  node: MailyJSONContent
): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.ID]: string } } => {
  return !!(
    (node.type === MailyContentTypeEnum.IMAGE || node.type === MailyContentTypeEnum.INLINE_IMAGE) &&
    node.attrs &&
    ((node.attrs[MailyAttrsEnum.SRC] !== undefined && typeof node.attrs[MailyAttrsEnum.SRC] === 'string') ||
      (node.attrs[MailyAttrsEnum.EXTERNAL_LINK] !== undefined &&
        typeof node.attrs[MailyAttrsEnum.EXTERNAL_LINK] === 'string'))
  );
};

export const isLinkNode = (
  node: MailyJSONContent
): node is MailyJSONContent & { attrs: { [MailyAttrsEnum.ID]: string } } => {
  return !!(
    node.type === MailyContentTypeEnum.LINK &&
    node.attrs &&
    node.attrs[MailyAttrsEnum.HREF] !== undefined &&
    typeof node.attrs[MailyAttrsEnum.HREF] === 'string'
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

  if (type === MailyContentTypeEnum.INLINE_IMAGE) {
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

  // Rich Chat `cardButton` node (see libs/maily-core card-button). Its variable attrs use
  // dedicated flags that are not part of MailyAttrsEnum, so they are referenced by literal key.
  if ((type as string) === CHAT_CARD_BUTTON_NODE_TYPE) {
    return [
      { attr: 'label' as MailyAttrsEnum, flag: 'isLabelVariable' as MailyAttrsEnum },
      { attr: MailyAttrsEnum.URL, flag: 'isUrlVariable' as MailyAttrsEnum },
      { attr: 'actionId' as MailyAttrsEnum, flag: 'isActionIdVariable' as MailyAttrsEnum },
      ...commonConfig,
    ];
  }

  return commonConfig;
};

const CHAT_CARD_BUTTON_NODE_TYPE = 'cardButton';

const LIQUID_EXPRESSION_PATTERN = /^\{\{[\s\S]*\}\}$/;

function isLiquidExpression(value: string): boolean {
  return LIQUID_EXPRESSION_PATTERN.test(value.trim());
}

/** Bare paths authored via the variable picker, e.g. `payload.foo` (no `{{ }}`). */
function isBareLiquidVariablePath(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || isLiquidExpression(trimmed)) {
    return false;
  }

  return /^(payload|subscriber|steps|context|workflow|env)(\.[a-zA-Z0-9_-]+|\[\d+\])+/.test(trimmed);
}

function isCardButtonNode(type: unknown): boolean {
  return type === CHAT_CARD_BUTTON_NODE_TYPE;
}

function shouldWrapVariableAttr(type: unknown, attrValue: string, flagValue: unknown): boolean {
  if (flagValue) {
    return true;
  }

  return isCardButtonNode(type) && isBareLiquidVariablePath(attrValue);
}

/**
 * Converts inline Maily `variable` nodes into plain text nodes carrying the (already
 * liquid-wrapped) variable expression, so a subsequent Liquid render resolves them.
 * Mirrors the email renderer's `processVariableNodeTypes`, but as a pure recursive pass
 * for the chat compile pipeline. Returns a new tree; the input is not mutated.
 */
export const resolveMailyVariableNodesToText = (node: MailyJSONContent): MailyJSONContent => {
  const isVariable = node.type === MailyContentTypeEnum.VARIABLE && typeof node.attrs?.id === 'string';

  if (isVariable) {
    return { type: 'text', text: (node.attrs as { id: string }).id };
  }

  if (!node.content) {
    return node;
  }

  return { ...node, content: node.content.map(resolveMailyVariableNodesToText) };
};

/**
 * Resolves Maily control-flow nodes in place, mirroring the email renderer's pipeline so chat
 * cards support the same authoring features:
 * - `showIfKey` conditionals: the node is dropped from its parent when the condition is falsy.
 * - `each`/repeat loops: the node's content is multiplied per iterable item, with array indexes
 *   injected into the liquid expressions of the cloned children.
 * - `variable` nodes: normalized into liquid-ready `text` nodes.
 *
 * A Liquid engine is required to evaluate show conditions and iterable expressions. The passed
 * `variables` should already be JSON-escaped by the caller. Returns the (mutated) root node.
 */
export const transformMailyContent = async (
  node: MailyJSONContent,
  variables: object,
  liquidEngine: Liquid,
  parent?: MailyJSONContent
): Promise<MailyJSONContent> => {
  const queue: Array<{ node: MailyJSONContent; parent?: MailyJSONContent }> = [{ node, parent }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) {
      continue;
    }

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
};

const handleShowNode = async (
  node: MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } },
  variables: object,
  liquidEngine: Liquid,
  parent?: MailyJSONContent
): Promise<boolean> => {
  const shouldShow = await evaluateShowCondition(variables, node, liquidEngine);
  if (!shouldShow && parent?.content) {
    parent.content = parent.content.filter((pNode) => pNode !== node);
  }

  delete (node.attrs as Record<string, string>)[MailyAttrsEnum.SHOW_IF_KEY];

  return shouldShow;
};

const handleEachNode = async (
  node: MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } },
  variables: object,
  liquidEngine: Liquid,
  parent?: MailyJSONContent
): Promise<void> => {
  const newContent = await multiplyForEachNode(node, variables, liquidEngine);

  if (parent?.content) {
    const nodeIndex = parent.content.indexOf(node);
    parent.content = [...parent.content.slice(0, nodeIndex), ...newContent, ...parent.content.slice(nodeIndex + 1)];
  } else {
    node.content = newContent;
  }
};

const evaluateShowCondition = async (
  variables: object,
  node: MailyJSONContent & { attrs: { [MailyAttrsEnum.SHOW_IF_KEY]: string } },
  liquidEngine: Liquid
): Promise<boolean> => {
  const { [MailyAttrsEnum.SHOW_IF_KEY]: showIfKey } = node.attrs;
  const parsedShowIfValue = await liquidEngine.parseAndRender(showIfKey, variables);

  return stringToBoolean(parsedShowIfValue);
};

const processVariableNodeTypes = (node: MailyJSONContent) => {
  node.type = 'text'; // set 'variable' to 'text' so Liquid recognizes it
  node.text = node.attrs?.id || '';
};

/**
 * For an 'each' node, multiply the content by the number of items in the iterable array
 * and add indexes to the placeholders. If the iterations attribute is set, limits the number
 * of iterations to that value, otherwise renders all items.
 */
const multiplyForEachNode = async (
  node: MailyJSONContent & { attrs: { [MailyAttrsEnum.EACH_KEY]: string } },
  variables: object,
  liquidEngine: Liquid
): Promise<MailyJSONContent[]> => {
  const iterablePath = node.attrs[MailyAttrsEnum.EACH_KEY];
  const iterations = node.attrs[MailyAttrsEnum.ITERATIONS_KEY];
  const forEachNodes = node.content || [];
  const iterableArray = await getIterableArray(iterablePath, variables, liquidEngine);
  const limitedIterableArray = iterations ? iterableArray.slice(0, iterations) : iterableArray;

  return limitedIterableArray.flatMap((_, index) => processForEachNodes(forEachNodes, iterablePath, index));
};

const getIterableArray = async (iterablePath: string, variables: object, liquidEngine: Liquid): Promise<unknown[]> => {
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
};

const processForEachNodes = (
  nodes: MailyJSONContent[],
  iterablePath: string,
  index: number
): Array<MailyJSONContent | MailyJSONMarks> => {
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

    if (isCardButtonNode(processedNode.type)) {
      for (const attr of ['label', 'url', 'actionId'] as const) {
        const value = processedNode.attrs?.[attr];

        if (typeof value === 'string' && value) {
          processedNode.attrs[attr] = addIndexToLiquidExpression(value, iterablePath, index);
        }
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
};

/**
 * Add the index to the liquid expression if it doesn't already have an array index.
 *
 * @example
 * text: '{{ payload.comments.author }}'
 * iterablePath: '{{ payload.comments }}'
 * index: 0
 * result: '{{ payload.comments[0].author }}'
 */
const addIndexToLiquidExpression = (text: string, iterablePath: string, index: number): string => {
  const cleanPath = iterablePath.replace(/\{\{|\}\}/g, '').trim();
  const liquidMatch = text.match(/\{\{\s*(.*?)\s*\}\}/);

  if (!liquidMatch) {
    return text;
  }

  const [path, ...filters] = liquidMatch[1].split('|').map((part) => part.trim());
  if (path.includes('[')) {
    return text;
  }

  const newPath = path.replace(cleanPath, `${cleanPath}[${index}]`);

  return filters.length ? `{{ ${newPath} | ${filters.join(' | ')} }}` : `{{ ${newPath} }}`;
};

const stringToBoolean = (value: string): boolean => {
  const normalized = value.toLowerCase().trim();
  if (normalized === 'false' || normalized === 'null' || normalized === 'undefined') {
    return false;
  }

  try {
    return Boolean(JSON.parse(normalized));
  } catch {
    return Boolean(normalized);
  }
};

const wrapInLiquidOutput = (variableName: string, fallback?: string, aliasFor?: string): string => {
  const trimmed = variableName.trim();

  if (isLiquidExpression(trimmed)) {
    return trimmed;
  }

  const actualVariableName = aliasFor || variableName;
  const fallbackSuffix = fallback ? ` | default: '${fallback}'` : '';

  return `{{ ${actualVariableName}${fallbackSuffix} }}`;
};

type ProcessAttributesArgs = {
  attrValue: string;
  attrKey: MailyAttrsEnum;
  attrs: Record<string, any>;
};
type ProcessAttributesFunction = (args: ProcessAttributesArgs) => string | boolean | number;
type ShouldProcessAttrFunction = (args: ProcessAttributesArgs) => boolean;

type ProcessFlagArgs = {
  flagValue: string;
  flagKey: MailyAttrsEnum;
  attrs: Record<string, any>;
};
type ProcessFlagFunction = (args: ProcessFlagArgs) => string | boolean | number;
type ShouldProcessFlagFunction = (args: ProcessFlagArgs) => boolean;

const processVariableNodeAttributes = ({
  node,
  shouldProcessAttr,
  shouldProcessFlag,
  processAttr,
  processFlag,
}: {
  node: MailyJSONContent & { attrs: Record<string, string> };
  shouldProcessAttr?: ShouldProcessAttrFunction;
  shouldProcessFlag?: ShouldProcessFlagFunction;
  processAttr?: ProcessAttributesFunction;
  processFlag?: ProcessFlagFunction;
}) => {
  const { attrs, type } = node;
  const config = variableAttributeConfig(type as MailyContentTypeEnum);
  const processedAttrs = { ...attrs };

  config.forEach(({ attr, flag }) => {
    const attrValue = attrs[attr];
    const flagValue = attrs[flag];

    if (!attrValue || typeof attrValue !== 'string') {
      return;
    }

    if (!shouldWrapVariableAttr(type, attrValue, flagValue)) {
      return;
    }

    const attrArgs = { attrValue, attrKey: attr, attrs };
    if (shouldProcessAttr?.(attrArgs) && processAttr) {
      processedAttrs[attr] = processAttr(attrArgs);
    }

    if (flagValue) {
      const flagArgs = { flagValue, flagKey: flag, attrs };
      if (shouldProcessFlag?.(flagArgs) && processFlag) {
        processedAttrs[flag] = processFlag(flagArgs);
      }
    }
  });

  return processedAttrs;
};

const processNodeMarks = ({
  node,
  shouldProcessAttr,
  shouldProcessFlag,
  processAttr,
  processFlag,
}: {
  node: MailyJSONContent & { marks: Record<string, any>[] };
  shouldProcessAttr?: ShouldProcessAttrFunction;
  shouldProcessFlag?: ShouldProcessFlagFunction;
  processAttr?: ProcessAttributesFunction;
  processFlag?: ProcessFlagFunction;
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

      if (!flagValue || !attrValue || typeof attrValue !== 'string') {
        return;
      }

      const attrArgs = { attrValue, attrKey: attr, attrs };
      if (shouldProcessAttr?.(attrArgs) && processAttr) {
        processedMark.attrs[attr] = processAttr(attrArgs);
      }

      const flagArgs = { flagValue, flagKey: flag, attrs };
      if (shouldProcessFlag?.(flagValue) && processFlag) {
        processedMark.attrs[flag] = processFlag(flagArgs);
      }
    });

    return processedMark;
  });
};

const processMailyNodes = ({
  node,
  shouldProcessAttr,
  shouldProcessFlag,
  processAttr,
  processFlag,
}: {
  node: MailyJSONContent;
  shouldProcessAttr?: ShouldProcessAttrFunction;
  shouldProcessFlag?: ShouldProcessFlagFunction;
  processAttr?: ProcessAttributesFunction;
  processFlag?: ProcessFlagFunction;
}): MailyJSONContent => {
  const newNode = { ...node } as MailyJSONContent & { attrs: Record<string, any> };

  if (node.content) {
    newNode.content = node.content.map((child) =>
      processMailyNodes({
        node: child,
        shouldProcessAttr,
        shouldProcessFlag,
        processAttr,
        processFlag,
      })
    );
  }

  if (hasAttrs(node)) {
    newNode.attrs = processVariableNodeAttributes({
      node,
      shouldProcessAttr,
      shouldProcessFlag,
      processAttr,
      processFlag,
    });
  }

  if (hasMarks(node)) {
    newNode.marks = processNodeMarks({
      node,
      shouldProcessAttr,
      shouldProcessFlag,
      processAttr,
      processFlag,
    });
  }

  return newNode;
};

/**
 * Replaces Maily nodes based on a condition function.
 *
 * @param content - The stringified Maily JSON content
 * @param conditionFn - Function that determines which nodes to replace
 * @param replacementFn - Function that returns the replacement node or nodes
 * @returns The modified Maily JSON content
 *
 * @example
 * Input:
 * {
 *   type: "doc",
 *   content: [
 *     { type: "variable", attrs: { id: "user.name" } },
 *     { type: "paragraph", content: [{ type: "text", text: "Hello" }] }
 *   ]
 * }
 *
 * replaceMailyNodesByCondition(
 *   content,
 *   (node) => node.type === "variable" && node.attrs?.id === "user.name",
 *   (node) => ({ type: "text", text: "John Doe" })
 * )
 *
 * Output:
 * {
 *   type: "doc",
 *   content: [
 *     { type: "text", text: "John Doe" },
 *     { type: "paragraph", content: [{ type: "text", text: "Hello" }] }
 *   ]
 * }
 */
export const replaceMailyNodesByCondition = (
  content: string,
  conditionFn: (node: MailyJSONContent) => boolean,
  replacementFn: (node: MailyJSONContent) => MailyJSONContent | MailyJSONContent[] | null
): MailyJSONContent => {
  const mailyJSONContent: MailyJSONContent = JSON.parse(content);

  const processNodes = (node: MailyJSONContent): MailyJSONContent | MailyJSONContent[] | null => {
    // Check if this node should be replaced
    if (conditionFn(node)) {
      return replacementFn(node);
    }

    // Process children if they exist
    if (node.content && Array.isArray(node.content)) {
      const processedContent: MailyJSONContent[] = [];

      for (const child of node.content) {
        const processedChild = processNodes(child);

        if (processedChild === null) {
        } else if (Array.isArray(processedChild)) {
          // Handle multiple replacement nodes
          processedContent.push(...processedChild);
        } else {
          // Handle single replacement node
          processedContent.push(processedChild);
        }
      }

      return {
        ...node,
        content: processedContent,
      };
    }

    return node;
  };

  const result = processNodes(mailyJSONContent);

  // Ensure we always return a single node (should be the root doc)
  return Array.isArray(result) ? result[0] : result || mailyJSONContent;
};

/**
 * Replaces Maily variables in the content with a replacement string.
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
 * 'payload.comments.name',
 * 'FOO'
 *
 * Output:
 * {
 *   type: "repeat",
 *   attrs: { each: "payload.comments" },
 *   content: [{
 *     type: "variable",
 *     attrs: { id: "FOO" }
 *   }]
 * },
 */
export const replaceMailyVariables = (content: string, variableToReplace: string, replacement: string) => {
  const mailyJSONContent: MailyJSONContent = JSON.parse(content);

  return processMailyNodes({
    node: mailyJSONContent,
    shouldProcessAttr: ({ attrValue }) => attrValue === variableToReplace,
    processAttr: () => replacement,
  });
};

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
export const wrapMailyInLiquid = (content: string) => {
  const mailyJSONContent: MailyJSONContent = JSON.parse(content);

  return processMailyNodes({
    node: mailyJSONContent,
    shouldProcessAttr: ({ attrValue, attrKey, attrs }) => {
      // Don't process button variable by Liquid if it's a translation key
      if (
        attrKey === MailyAttrsEnum.TEXT &&
        attrs.isTextVariable === true &&
        TRANSLATION_KEY_SINGLE_REGEX.test(attrValue)
      ) {
        return false;
      }

      return true;
    },
    processAttr: ({ attrValue, attrs }) => {
      const { fallback, aliasFor } = attrs;

      return wrapInLiquidOutput(attrValue, fallback, aliasFor);
    },
    shouldProcessFlag: ({ flagKey }) => !MAILY_FIRST_CITIZEN_VARIABLE_KEY.includes(flagKey),
    processFlag: () => {
      return false;
    },
  });
};

export const hasMailyVariable = (content: string, variable: string): boolean => {
  const mailyJSONContent: MailyJSONContent = JSON.parse(content);
  let result = false;

  processMailyNodes({
    node: mailyJSONContent,
    shouldProcessAttr: ({ attrKey }) => attrKey === MailyAttrsEnum.ID,
    processAttr: ({ attrValue }) => {
      if (attrValue === variable) {
        result = true;
      }

      return attrValue;
    },
    shouldProcessFlag: ({ flagKey }) => flagKey === MailyAttrsEnum.ID,
    processFlag: ({ flagValue }) => {
      if (flagValue === variable) {
        result = true;
      }

      return flagValue;
    },
  });

  return result;
};

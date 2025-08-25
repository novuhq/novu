import { JSONContent as MailyJSONContent } from '@maily-to/render';
import { TRANSLATION_KEY_SINGLE_REGEX } from '@novu/shared';

import { MAILY_FIRST_CITIZEN_VARIABLE_KEY, MailyAttrsEnum, MailyContentTypeEnum } from './maily.types';

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

  return commonConfig;
};

const wrapInLiquidOutput = (variableName: string, fallback?: string, aliasFor?: string): string => {
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

    if (!flagValue || !attrValue || typeof attrValue !== 'string') {
      return;
    }

    const attrArgs = { attrValue, attrKey: attr, attrs };
    if (shouldProcessAttr?.(attrArgs) && processAttr) {
      processedAttrs[attr] = processAttr(attrArgs);
    }

    const flagArgs = { flagValue, flagKey: flag, attrs };
    if (shouldProcessFlag?.(flagArgs) && processFlag) {
      processedAttrs[flag] = processFlag(flagArgs);
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

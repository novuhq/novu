import type { JSONContent } from '@tiptap/core';

const LIQUID_VARIABLE_REGEX = /\{\{([^{}]*)\}\}/g;

/**
 * Converts a plain-text chat body with {{ liquid }} variables into a Maily/TipTap doc,
 * turning each variable into a variable pill node (parsing `| default: '...'` into the
 * fallback attribute). Used when switching a chat step from the text editor to blocks —
 * the conversion is lossless for plain text.
 */
export function plainTextWithLiquidToMailyDoc(text: string): JSONContent {
  const lines = text.split('\n');

  const paragraphs: JSONContent[] = lines.map((line) => {
    const content: JSONContent[] = [];
    let lastIndex = 0;

    for (const match of line.matchAll(LIQUID_VARIABLE_REGEX)) {
      const matchIndex = match.index ?? 0;

      if (matchIndex > lastIndex) {
        content.push({ type: 'text', text: line.slice(lastIndex, matchIndex) });
      }

      content.push(liquidExpressionToVariableNode(match[1]));
      lastIndex = matchIndex + match[0].length;
    }

    if (lastIndex < line.length) {
      content.push({ type: 'text', text: line.slice(lastIndex) });
    }

    return content.length > 0 ? { type: 'paragraph', content } : { type: 'paragraph' };
  });

  return { type: 'doc', content: paragraphs };
}

function liquidExpressionToVariableNode(expression: string): JSONContent {
  const [name, ...filters] = expression.split('|').map((part) => part.trim());

  const defaultFilter = filters.find((filter) => filter.startsWith('default:'));
  const fallback = defaultFilter
    ? defaultFilter
        .slice('default:'.length)
        .trim()
        .replace(/^['"]|['"]$/g, '')
    : null;

  return {
    type: 'variable',
    attrs: {
      id: name,
      label: null,
      fallback,
      required: false,
      aliasFor: null,
    },
  };
}

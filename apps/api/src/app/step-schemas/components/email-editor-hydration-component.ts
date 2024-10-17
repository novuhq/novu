/* eslint-disable */
import { TipTapNodeSchemaDto } from '@novu/shared-internal';

function handleForTraversal(node: TipTapNodeSchemaDto, placeholders: PlaceholderMap) {
  const mainPlaceholder = node.attr.each;
  if (mainPlaceholder) {
    if (!placeholders.for[mainPlaceholder]) {
      placeholders.for[mainPlaceholder] = [];
    }

    if (node.content) {
      node.content.forEach((nestedNode) => {
        if (nestedNode.content) {
          nestedNode.content.forEach((childNode) => {
            if (childNode.type === 'text' && childNode.text) {
              // Collect the nested placeholder directly without additional formatting
              const nestedPlaceholders = extractPlaceholders(childNode.text); // Use text directly
              for (let nestedPlaceholder of nestedPlaceholders) {
                placeholders.for[mainPlaceholder].push(nestedPlaceholder);
              }
            }
          });
        }
      });
    }
  }
}

function handleShowTraversal(node: TipTapNodeSchemaDto, placeholders: PlaceholderMap) {
  const showPlaceholder = node.attr.when;
  if (showPlaceholder) {
    placeholders.show[showPlaceholder] = [];
  }
}

/**
 * Collects placeholders from a TipTapNode structure.
 *
 * @param {TipTapNodeSchemaDto} node - The root node of the TipTap structure.
 * @returns {PlaceholderMap} An object mapping main placeholders to their nested placeholders.
 */
export function collectPlaceholders(node: TipTapNodeSchemaDto): PlaceholderMap {
  const placeholders: PlaceholderMap = {
    for: {},
    show: {},
    regular: {},
  };

  function traverse(node: TipTapNodeSchemaDto) {
    if (node.type === 'for' && node.attr) {
      handleForTraversal(node, placeholders);
    } else if (node.type === 'show' && node.attr) {
      handleShowTraversal(node, placeholders);
    } else if (node.type === 'text' && node.text) {
      // Regular placeholders should not be prefixed
      const regularPlaceholders = extractPlaceholders(node.text).filter((x) => !x.startsWith('novu.item')); // Use text directly for regular placeholders
      console.log(JSON.stringify(regularPlaceholders));
      for (let regularPlaceholder of regularPlaceholders) {
        placeholders.regular[regularPlaceholder] = [];
      }
    }

    if (node.content) {
      node.content.forEach(traverse);
    }
  }

  traverse(node);
  return placeholders;
}
function extractPlaceholders(text: string): string[] {
  // Use regex to find all occurrences of {{...}}
  const regex = /\{\{(.*?)}}/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    matches.push(match[1].trim());
  }
  console.log('matches' + JSON.stringify(matches));
  return matches;
}

// Export PlaceholderMap type
export type PlaceholderMap = {
  for: {
    [key: string]: string[];
  };
  show: {
    [key: string]: any[];
  };
  regular: {
    [key: string]: any[];
  };
};

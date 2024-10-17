/* eslint-disable */
import { TipTapNodeSchemaDto } from '@novu/shared-internal';

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
      const regularPlaceholders = extractPlaceholders(node.text).filter((x) => !x.startsWith('item'));
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

export function transformPlaceholderMap(input: PlaceholderMap): Record<string, any> {
  const defaultPayload: Record<string, any> = {};

  const setNestedValue = (obj: Record<string, any>, path: string, value: any) => {
    const keys = path.split('.');
    let current = obj;

    keys.forEach((key, index) => {
      if (!current[key]) {
        current[key] = index === keys.length - 1 ? value : {};
      }
      current = current[key];
    });
  };

  processFor(input, setNestedValue, defaultPayload);

  for (const key in input.show) {
    setNestedValue(defaultPayload, key, 'true');
  }

  for (const key in input.regular) {
    setNestedValue(defaultPayload, key, `{{${key}}}`);
  }

  return defaultPayload;
}

function handleForTraversal(node: TipTapNodeSchemaDto, placeholders: PlaceholderMap) {
  const mainPlaceholder = extractPlaceholders(node.attr.each);
  if (mainPlaceholder && mainPlaceholder.length == 1) {
    if (!placeholders.for[mainPlaceholder[0]]) {
      placeholders.for[mainPlaceholder[0]] = [];
    }

    if (node.content) {
      node.content.forEach((nestedNode) => {
        if (nestedNode.content) {
          nestedNode.content.forEach((childNode) => {
            if (childNode.type === 'text' && childNode.text) {
              const nestedPlaceholders = extractPlaceholders(childNode.text);
              for (let nestedPlaceholder of nestedPlaceholders) {
                placeholders.for[mainPlaceholder[0]].push(nestedPlaceholder);
              }
            }
          });
        }
      });
    }
  }
}

function handleShowTraversal(node: TipTapNodeSchemaDto, placeholders: PlaceholderMap) {
  const nestedPlaceholders = extractPlaceholders(node.attr.when);
  placeholders.show[nestedPlaceholders[0]] = [];
}

function extractPlaceholders(text: string): string[] {
  // Updated regex to match {{{placeholder}}}, {{placeholder}}, and {#placeholder#}
  const regex = /\{\{\{(.*?)\}\}\}|\{\{(.*?)\}\}|\{#(.*?)#\}/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // Check for the first, second, or third capturing group
    const placeholder = match[1] || match[2] || match[3];
    if (placeholder) {
      matches.push(placeholder.trim());
    }
  }
  return matches;
}

function processFor(
  input: PlaceholderMap,
  setNestedValue: (obj: Record<string, any>, path: string, value: any) => void,
  defaultPayload: Record<string, any>
) {
  for (const key in input.for) {
    const items = input.for[key];
    const finalValue = [{}, {}];
    setNestedValue(defaultPayload, key, finalValue);
    items.forEach((item) => {
      const extractedKey = item.replace('item.', '');
      const valueFunc = (suffix) => `{#${item}#}-${suffix}`;
      setNestedValue(finalValue[0], extractedKey, valueFunc('1'));
      setNestedValue(finalValue[1], extractedKey, valueFunc('2'));
    });
  }
}

import { JSONContent } from '@tiptap/core';
import { DEFAULT_SPACER_HEIGHT } from '@/extensions';
import { spacing } from './spacing';

/**
 * To replace deprecated node type or attributes
 * to avoid breaking changes, we can replace the deprecated node type or attributes
 * with the new one in the JSON content object.
 * @param json - previous JSON content object
 * @returns JSONContent - new JSON content object
 */
export function replaceDeprecatedNode(json: JSONContent) {
  const stack = [json];

  while (stack.length) {
    const node = stack.pop();
    if (!node) {
      continue;
    }

    if (node.type === 'for') {
      node.type = 'repeat';
    }

    if (node.type === 'spacer') {
      let height = node.attrs?.height;
      if (typeof height === 'string' && ['sm', 'md', 'lg', 'xl'].includes(height)) {
        height = spacing.find((s) => s.short === height)?.value || DEFAULT_SPACER_HEIGHT;
      }

      node.attrs = {
        ...node.attrs,
        height,
      };
    }

    if (node.content) {
      stack.push(...node.content);
    }
  }

  return json;
}

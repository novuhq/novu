import { isStringifiedMailyJSONContent } from './maily-utils';

export type ChatEditorType = 'block' | 'text';

/**
 * Resolve a persistable chat `editorType` from control values.
 * Explicit `block`/`text` always wins. Otherwise Maily JSON bodies map to
 * `block` and any other non-empty string maps to `text`. Empty/missing bodies
 * return `undefined` so flag-off orgs do not persist a value.
 */
export function resolveChatEditorType(body: unknown, editorType: unknown): ChatEditorType | undefined {
  if (editorType === 'block' || editorType === 'text') {
    return editorType;
  }

  if (typeof body === 'string' && isStringifiedMailyJSONContent(body)) {
    return 'block';
  }

  if (typeof body === 'string' && body.length > 0) {
    return 'text';
  }

  return undefined;
}

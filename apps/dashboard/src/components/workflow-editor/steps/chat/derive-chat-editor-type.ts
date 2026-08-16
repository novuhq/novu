import { isMailyJson } from '@/components/maily/maily-utils';

export type ChatEditorType = 'block' | 'text';

/**
 * Resolve which chat editor to show.
 * - Explicit `editorType` always wins.
 * - Maily JSON bodies open in the block editor.
 * - Non-empty plain/Liquid bodies open in the text editor (legacy-safe).
 * - Empty bodies default to `block` when the block editor flag is on, otherwise `text`.
 */
export function deriveChatEditorType(
  body: unknown,
  editorType: unknown,
  isBlockEditorEnabled: boolean
): ChatEditorType {
  if (editorType === 'block' || editorType === 'text') {
    return editorType;
  }

  if (typeof body === 'string' && isMailyJson(body)) {
    return 'block';
  }

  if (typeof body === 'string' && body.length > 0) {
    return 'text';
  }

  return isBlockEditorEnabled ? 'block' : 'text';
}

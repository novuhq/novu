import type { Editor } from '@tiptap/core';
import { useMemo } from 'react';
import { type InlineDecoratorOptions } from '@/editor/extensions/inline-decorator/inline-decorator';
import { type VariableOptions } from '@/editor/nodes/variable/variable';

export function getNodeOptions<T extends Record<string, unknown>>(editor: Editor, name: string): T | null {
  const node = editor.extensionManager.extensions.find((extension) => extension.name === name);

  if (!node) {
    return null;
  }

  return node.options as T;
}

export function getVariableOptions(editor: Editor) {
  return getNodeOptions<VariableOptions>(editor, 'variable');
}

export function useVariableOptions(editor: Editor) {
  return useMemo(() => {
    return getVariableOptions(editor);
  }, [editor]);
}

export function getInlineDecoratorOptions(editor: Editor) {
  return getNodeOptions<InlineDecoratorOptions>(editor, 'inlineDecorator');
}

export function useInlineDecoratorOptions(editor: Editor) {
  return useMemo(() => {
    return getInlineDecoratorOptions(editor);
  }, [editor]);
}

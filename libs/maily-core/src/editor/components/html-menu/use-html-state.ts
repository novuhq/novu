import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';

export const useHtmlState = (editor: Editor) => {
  const states = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        activeTab: ctx.editor.getAttributes('htmlCodeBlock')?.activeTab || 'code',
        currentShowIfKey: ctx.editor.getAttributes('htmlCodeBlock')?.showIfKey || '',
      };
    },
    equalityFn: deepEql,
  });

  return states;
};

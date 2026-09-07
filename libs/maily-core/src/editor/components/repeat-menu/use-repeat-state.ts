import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';

export const useRepeatState = (editor: Editor) => {
  const states = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        each: ctx.editor.getAttributes('repeat')?.each,
        currentShowIfKey: ctx.editor.getAttributes('repeat')?.showIfKey || '',
        iterations: ctx.editor.getAttributes('repeat')?.iterations || 0,
        isSectionActive: ctx.editor.isActive('section'),
      };
    },
    equalityFn: deepEql,
  });

  return states;
};

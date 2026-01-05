import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';

export const useSpacerState = (editor: Editor) => {
  const states = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        currentShowIfKey: ctx.editor.getAttributes('spacer')?.showIfKey || '',
      };
    },
    equalityFn: deepEql,
  });

  return states;
};

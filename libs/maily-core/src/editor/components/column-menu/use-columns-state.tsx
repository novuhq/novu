import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';
import { getColumnCount, getColumnWidths } from '@/editor/utils/columns';

export const useColumnsState = (editor: Editor) => {
  const states = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        isSectionActive: ctx.editor.isActive('section'),
        isColumnActive: ctx.editor.isActive('column'),

        currentVerticalAlignment: ctx.editor.getAttributes('column')?.verticalAlign || 'top',

        currentShowIfKey: ctx.editor.getAttributes('columns')?.showIfKey || '',

        columnsCount: getColumnCount(ctx.editor),
        columnWidths: getColumnWidths(ctx.editor).map((c) => c.width),

        currentColumnsGap: ctx.editor.getAttributes('columns')?.gap || 0,
      };
    },
    equalityFn: deepEql,
  });

  return states;
};

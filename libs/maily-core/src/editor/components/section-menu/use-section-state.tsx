import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';
import { DEFAULT_SECTION_BACKGROUND_COLOR, DEFAULT_SECTION_BORDER_COLOR } from '@/editor/nodes/section/section';

export const useSectionState = (editor: Editor | null) => {
  const states = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          currentAlignment: 'left',
          currentBorderRadius: 0,
          currentBackgroundColor: DEFAULT_SECTION_BACKGROUND_COLOR,
          currentBorderColor: DEFAULT_SECTION_BORDER_COLOR,
        };
      }

      return {
        currentAlignment: ctx.editor.getAttributes('section')?.align || 'left',

        currentBorderRadius: Number(ctx.editor.getAttributes('section')?.borderRadius) || 0,
        currentBackgroundColor:
          ctx.editor.getAttributes('section')?.backgroundColor || DEFAULT_SECTION_BACKGROUND_COLOR,

        currentBorderColor: ctx.editor.getAttributes('section')?.borderColor || DEFAULT_SECTION_BORDER_COLOR,
        currentBorderWidth: Number(ctx.editor.getAttributes('section')?.borderWidth) || 0,

        currentMarginTop: Number(ctx.editor.getAttributes('section')?.marginTop) || 0,
        currentMarginRight: Number(ctx.editor.getAttributes('section')?.marginRight) || 0,
        currentMarginBottom: Number(ctx.editor.getAttributes('section')?.marginBottom) || 0,
        currentMarginLeft: Number(ctx.editor.getAttributes('section')?.marginLeft) || 0,

        currentPaddingTop: Number(ctx.editor.getAttributes('section')?.paddingTop) || 0,
        currentPaddingRight: Number(ctx.editor.getAttributes('section')?.paddingRight) || 0,
        currentPaddingBottom: Number(ctx.editor.getAttributes('section')?.paddingBottom) || 0,
        currentPaddingLeft: Number(ctx.editor.getAttributes('section')?.paddingLeft) || 0,

        isColumnsActive: ctx.editor.isActive('columns'),

        currentShowIfKey: ctx.editor.getAttributes('section')?.showIfKey || '',
      };
    },
    equalityFn: deepEql,
  });

  return states;
};

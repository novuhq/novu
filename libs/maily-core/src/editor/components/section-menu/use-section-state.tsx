import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';
import {
  DEFAULT_SECTION_BACKGROUND_COLOR,
  DEFAULT_SECTION_BORDER_COLOR,
  DEFAULT_SECTION_BORDER_RADIUS,
  DEFAULT_SECTION_BORDER_WIDTH,
  DEFAULT_SECTION_MARGIN_BOTTOM,
  DEFAULT_SECTION_MARGIN_LEFT,
  DEFAULT_SECTION_MARGIN_RIGHT,
  DEFAULT_SECTION_MARGIN_TOP,
  DEFAULT_SECTION_PADDING_BOTTOM,
  DEFAULT_SECTION_PADDING_LEFT,
  DEFAULT_SECTION_PADDING_RIGHT,
  DEFAULT_SECTION_PADDING_TOP,
} from '@/editor/nodes/section/section';

export const useSectionState = (editor: Editor | null) => {
  const states = useEditorState({
    editor,
    selector: (ctx) => {
      if (!ctx.editor) {
        return {
          currentAlignment: 'left',
          currentBorderRadius: DEFAULT_SECTION_BORDER_RADIUS,
          currentBackgroundColor: DEFAULT_SECTION_BACKGROUND_COLOR,
          currentBorderColor: DEFAULT_SECTION_BORDER_COLOR,
        };
      }

      return {
        currentAlignment: ctx.editor.getAttributes('section')?.align || 'left',

        currentBorderRadius: Number(ctx.editor.getAttributes('section')?.borderRadius) || DEFAULT_SECTION_BORDER_RADIUS,
        currentBackgroundColor:
          ctx.editor.getAttributes('section')?.backgroundColor || DEFAULT_SECTION_BACKGROUND_COLOR,

        currentBorderColor: ctx.editor.getAttributes('section')?.borderColor || DEFAULT_SECTION_BORDER_COLOR,
        currentBorderWidth: Number(ctx.editor.getAttributes('section')?.borderWidth) || DEFAULT_SECTION_BORDER_WIDTH,

        currentMarginTop: Number(ctx.editor.getAttributes('section')?.marginTop) || DEFAULT_SECTION_MARGIN_TOP,
        currentMarginRight: Number(ctx.editor.getAttributes('section')?.marginRight) || DEFAULT_SECTION_MARGIN_RIGHT,
        currentMarginBottom: Number(ctx.editor.getAttributes('section')?.marginBottom) || DEFAULT_SECTION_MARGIN_BOTTOM,
        currentMarginLeft: Number(ctx.editor.getAttributes('section')?.marginLeft) || DEFAULT_SECTION_MARGIN_LEFT,

        currentPaddingTop: Number(ctx.editor.getAttributes('section')?.paddingTop) || DEFAULT_SECTION_PADDING_TOP,
        currentPaddingRight: Number(ctx.editor.getAttributes('section')?.paddingRight) || DEFAULT_SECTION_PADDING_RIGHT,
        currentPaddingBottom:
          Number(ctx.editor.getAttributes('section')?.paddingBottom) || DEFAULT_SECTION_PADDING_BOTTOM,
        currentPaddingLeft: Number(ctx.editor.getAttributes('section')?.paddingLeft) || DEFAULT_SECTION_PADDING_LEFT,

        isColumnsActive: ctx.editor.isActive('columns'),

        currentShowIfKey: ctx.editor.getAttributes('section')?.showIfKey || '',
      };
    },
    equalityFn: deepEql,
  });

  return states;
};

import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';
import { AllowedLogoAlignment } from '@/editor/nodes/logo/logo';

export const DEFAULT_TEXT_COLOR = '#374151';

export const useTextMenuState = (editor: Editor) => {
  const states = useEditorState({
    editor,
    selector: (ctx) => {
      return {
        currentTextColor: ctx.editor.getAttributes('textStyle').color || DEFAULT_TEXT_COLOR,

        linkUrl: ctx.editor?.getAttributes('link').href,
        textAlign: (ctx.editor?.isActive({ textAlign: 'left' })
          ? 'left'
          : ctx.editor?.isActive({ textAlign: 'center' })
            ? 'center'
            : ctx.editor?.isActive({ textAlign: 'right' })
              ? 'right'
              : ctx.editor?.isActive({ textAlign: 'justify' })
                ? 'justify'
                : 'left') as AllowedLogoAlignment,

        isListActive: ctx.editor.isActive('bulletList') || ctx.editor.isActive('orderedList'),
        isUrlVariable: ctx.editor.getAttributes('link').isUrlVariable ?? false,

        isHeadingActive: ctx.editor.isActive('heading'),
        headingShowIfKey: ctx.editor.getAttributes('heading')?.showIfKey || '',

        isParagraphActive: ctx.editor.isActive('paragraph'),
        paragraphShowIfKey: ctx.editor.getAttributes('paragraph')?.showIfKey || '',
      };
    },
    equalityFn: deepEql,
  });

  return states;
};

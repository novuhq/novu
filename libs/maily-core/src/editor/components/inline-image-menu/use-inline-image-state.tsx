import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';
import { DEFAULT_INLINE_IMAGE_HEIGHT, DEFAULT_INLINE_IMAGE_WIDTH } from '@/editor/nodes/inline-image/inline-image';

export const useInlineImageState = (editor: Editor) => {
  const states = useEditorState({
    editor,
    selector: ({ editor }) => {
      return {
        height: editor.getAttributes('inlineImage')?.height || DEFAULT_INLINE_IMAGE_HEIGHT,
        width: editor.getAttributes('inlineImage')?.width || DEFAULT_INLINE_IMAGE_WIDTH,
        src: editor.getAttributes('inlineImage')?.src || '',
        isSrcVariable: editor.getAttributes('inlineImage')?.isSrcVariable ?? false,
        imageExternalLink: editor.getAttributes('inlineImage')?.externalLink || '',
        isExternalLinkVariable: editor.getAttributes('inlineImage')?.isExternalLinkVariable ?? false,
      };
    },
    equalityFn: deepEql,
  });

  return states;
};

import { Editor, useEditorState } from '@tiptap/react';
import deepEql from 'fast-deep-equal';
import { DEFAULT_LOGO_SIZE } from '@/editor/nodes/logo/logo';

export const useImageState = (editor: Editor) => {
  const states = useEditorState({
    editor,
    selector: ({ editor }) => {
      return {
        width: String(editor.getAttributes('image').width),
        height: String(editor.getAttributes('image').height),
        isImageActive: editor.isActive('image'),
        isLogoActive: editor.isActive('logo'),
        alignment: editor.getAttributes('image')?.alignment || editor.getAttributes('logo')?.alignment,
        borderRadius: editor.getAttributes('image')?.borderRadius,

        logoSize: editor.getAttributes('logo')?.size || DEFAULT_LOGO_SIZE,
        imageSrc: editor.getAttributes('image')?.src || editor.getAttributes('logo')?.src || '',
        isSrcVariable:
          editor.getAttributes('image')?.isSrcVariable ?? editor.getAttributes('logo')?.isSrcVariable ?? false,
        imageExternalLink: editor.getAttributes('image')?.externalLink || '',
        isExternalLinkVariable: editor.getAttributes('image')?.isExternalLinkVariable,

        lockAspectRatio: editor.getAttributes('image')?.lockAspectRatio,
        aspectRatio: editor.getAttributes('image')?.aspectRatio,

        currentShowIfKey: editor.getAttributes('image')?.showIfKey || editor.getAttributes('logo')?.showIfKey || '',
      };
    },
    equalityFn: deepEql,
  });

  return states;
};

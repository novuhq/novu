import { Editor, Extension } from '@tiptap/core';
import { useMemo } from 'react';
import { ImageUploadPlugin, ImageUploadPluginOptions } from '@/editor/plugins/image-upload/image-upload-plugin';

export type ImageUploadOptions = Omit<ImageUploadPluginOptions, 'editor'> & {};
export type ImageUploadStorage = {
  placeholderImages: Set<string>;
};

export const ImageUploadExtension = Extension.create<ImageUploadOptions>({
  name: 'imageUpload',

  addOptions() {
    return {
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      onImageUpload: undefined,
    };
  },

  addStorage() {
    return {
      placeholderImages: new Set(),
    };
  },

  addProseMirrorPlugins() {
    const { onImageUpload } = this.options;

    if (!onImageUpload) {
      return [];
    }

    return [
      ImageUploadPlugin({
        editor: this.editor,
        allowedMimeTypes: this.options.allowedMimeTypes,
        onImageUpload: this.options.onImageUpload,
      }),
    ];
  },
});

export function useImageUploadOptions(editor: Editor): ImageUploadOptions {
  return useMemo(() => {
    const node = editor.extensionManager.extensions.find((extension) => extension.name === 'imageUpload');

    return node?.options || {};
  }, [editor]);
}

import { Editor } from '@tiptap/core';
import { ImageUpIcon } from 'lucide-react';
import { useRef } from 'react';
import { useImageUploadOptions } from '@/editor/extensions/image-upload/image-upload';

type UploadImageActionProps = {
  editor: Editor;
  /** Closes the containing popover once a file has been picked. */
  close: () => void;
};

/**
 * "Upload image" row rendered inside the image source popover. Picking a file
 * uploads it via the configured onImageUpload callback and swaps the selected
 * image node's src. Renders nothing when uploads are not configured.
 */
export function UploadImageAction(props: UploadImageActionProps) {
  const { editor, close } = props;

  const { onImageUpload, allowedMimeTypes = [] } = useImageUploadOptions(editor);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!onImageUpload) {
    return null;
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Clear the input so picking the same file again re-triggers onChange.
    e.target.value = '';

    if (!file || (allowedMimeTypes.length > 0 && !allowedMimeTypes.includes(file.type))) {
      return;
    }

    // Capture the selected image node before the async upload — the selection may
    // move while the file uploads, so we can't resolve the target afterwards.
    const pos = editor.state.selection.from;
    const prevSrc = editor.state.doc.nodeAt(pos)?.attrs?.src;

    close();

    try {
      const uploadedSrc = await onImageUpload(file);

      const nodeAtPos = editor.state.doc.nodeAt(pos);

      if (nodeAtPos?.type.name === 'image') {
        const { tr } = editor.state;
        tr.setNodeMarkup(pos, undefined, { ...nodeAtPos.attrs, src: uploadedSrc, isSrcVariable: false });
        editor.view.dispatch(tr);
      } else {
        // The document shifted during the upload; fall back to matching the node
        // by the src it had when the file was picked.
        const { tr } = editor.state;
        let found = false;

        editor.state.doc.descendants((node, nodePos) => {
          if (!found && node.type.name === 'image' && node.attrs.src === prevSrc) {
            tr.setNodeMarkup(nodePos, undefined, { ...node.attrs, src: uploadedSrc, isSrcVariable: false });
            found = true;
            return false;
          }
        });

        if (found) {
          editor.view.dispatch(tr);
        }
      }
    } catch (error) {
      console.error('Image replace failed', error);
    }
  };

  return (
    <div className="mly-mb-1.5">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="mly-flex mly-h-8 mly-w-full mly-items-center mly-gap-2 mly-rounded-lg mly-border mly-border-gray-300 mly-bg-white mly-px-2 mly-text-sm mly-font-medium mly-text-midnight-gray mly-shadow-sm mly-transition-colors hover:mly-bg-gray-50"
      >
        <ImageUpIcon className="mly-h-3 mly-w-3 mly-shrink-0 mly-stroke-[2.5]" />
        <span>Upload image</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={allowedMimeTypes.length > 0 ? allowedMimeTypes.join(',') : 'image/*'}
        onChange={handleFileChange}
        className="mly-hidden"
        multiple={false}
      />
    </div>
  );
}

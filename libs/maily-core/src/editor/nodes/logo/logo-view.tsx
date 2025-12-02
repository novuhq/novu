import { NodeViewProps } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import { useCallback, useEffect, useState } from 'react';
import { useImageUploadOptions } from '@/editor/extensions/image-upload/image-upload';
import { cn } from '@/editor/utils/classname';
import { ImageStatus, ImageStatusLabel } from '../image/image-view';
import { LogoAttributes, logoSizes } from './logo';

export function LogoView(props: NodeViewProps) {
  const { node, editor } = props;

  const [status, setStatus] = useState<ImageStatus>('idle');
  const [isPlaceholderImage, setIsPlaceholderImage] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const { onImageUpload, allowedMimeTypes = [] } = useImageUploadOptions(editor);

  const { alignment = 'center', src: logoSrc, isSrcVariable, size = 'sm' } = (node.attrs || {}) as LogoAttributes;

  const hasImageSrc = !!logoSrc;
  const isDroppable = !!onImageUpload && editor.isEditable && !isSrcVariable && status === 'idle';

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDroppable || !e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    await handleImageUpload(file);
  };

  const handleImageUpload = useCallback(
    async (file: File) => {
      if (!isDroppable) {
        return;
      }

      try {
        setStatus('loading');
        const imageUrl = await onImageUpload(file);
        editor.chain().updateLogoAttributes({ src: imageUrl }).run();
        setIsPlaceholderImage(false);
        setStatus('loaded');
      } catch (error) {
        console.error('Error uploading image:', error);
        setStatus('error');
      }
    },
    [onImageUpload]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (!isDroppable) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(true);
    },
    [onImageUpload]
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (!isDroppable) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
    },
    [onImageUpload]
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      if (!isDroppable) {
        return;
      }

      e.preventDefault();
      e.stopPropagation();
      setIsDraggingOver(false);
      const files = e.dataTransfer?.files;
      if (!files || files?.length === 0) {
        return;
      }

      const firstFile = files[0];
      if (!allowedMimeTypes.includes(firstFile.type)) {
        return;
      }

      await handleImageUpload(firstFile);
    },
    [handleImageUpload]
  );

  // load the image using new Image() to avoid layout shift
  // then if the image is loaded, set the status to loaded
  useEffect(() => {
    if (!logoSrc) {
      return;
    }

    setStatus('loading');
    const isPlaceHolder = editor?.extensionStorage?.imageUpload?.placeholderImages?.has(logoSrc) ?? false;
    setIsPlaceholderImage(isPlaceHolder);
    const img = new Image();
    img.src = logoSrc;
    img.onload = () => {
      setStatus('loaded');
    };
    img.onerror = () => {
      setStatus('error');
    };

    return () => {
      img.src = '';
      img.onload = null;
      img.onerror = null;
    };
  }, [logoSrc]);

  const logoSize = logoSizes[size];

  return (
    <NodeViewWrapper
      as="div"
      draggable={editor.isEditable}
      data-drag-handle={editor.isEditable}
      style={{
        overflow: 'hidden',
        position: 'relative',
        // Weird! Basically tiptap/prose wraps this in a span and the line height causes an annoying buffer.
        lineHeight: '0px',
        display: 'block',
      }}
      className={cn('mly-image-drop-zone', isDraggingOver && 'mly-drag-over')}
      {...(isDroppable
        ? {
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
          }
        : {})}
    >
      {!hasImageSrc && status === 'idle' && (
        <ImageStatusLabel status="idle" minHeight={logoSize} isDropZone={isDroppable} />
      )}

      {!hasImageSrc && status === 'loading' && !isSrcVariable && (
        <ImageStatusLabel status="loading" minHeight={logoSize} />
      )}

      {hasImageSrc && isSrcVariable && <ImageStatusLabel status="variable" minHeight={logoSize} />}
      {hasImageSrc && status === 'loading' && !isSrcVariable && (
        <ImageStatusLabel status="loading" minHeight={logoSize} />
      )}
      {hasImageSrc && status === 'error' && !isSrcVariable && <ImageStatusLabel status="error" minHeight={logoSize} />}

      {isDroppable && (
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="mly-absolute mly-inset-0 mly-opacity-0"
          multiple={false}
        />
      )}

      {hasImageSrc && status === 'loaded' && !isSrcVariable && (
        <img
          src={logoSrc}
          alt="Logo"
          style={{
            height: logoSize,
            width: logoSize,
            cursor: 'default',
            marginBottom: 0,
            ...({
              center: { marginLeft: 'auto', marginRight: 'auto' },
              left: { marginRight: 'auto' },
              right: { marginLeft: 'auto' },
            }[alignment] || {}),
          }}
          draggable={editor.isEditable}
        />
      )}
    </NodeViewWrapper>
  );
}

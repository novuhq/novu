import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Ban, BracesIcon, GrabIcon, ImageOffIcon, Loader2 } from 'lucide-react';
import { type CSSProperties, useCallback, useEffect, useRef, useState } from 'react';
import { useImageUploadOptions } from '@/editor/extensions/image-upload/image-upload';
import { getAspectRatio, getNewHeight, getNewWidth } from '@/editor/utils/aspect-ratio';
import { cn } from '@/editor/utils/classname';
import { getNodeOptions } from '@/editor/utils/node-options';
import { useEvent } from '@/editor/utils/use-event';
import type { ImageExtensionOptions } from './image';

const MIN_WIDTH = 20;
export const IMAGE_MAX_WIDTH = 600;
export const IMAGE_MAX_HEIGHT = 400;

function fitImageWithinBounds({
  naturalWidth,
  naturalHeight,
  containerWidth,
  maxWidth,
  maxHeight,
  fitToMaxBounds,
}: {
  naturalWidth: number;
  naturalHeight: number;
  containerWidth: number;
  maxWidth?: number;
  maxHeight?: number;
  /** Chat-only: preview-matching scale; email leaves this false. */
  fitToMaxBounds?: boolean;
}) {
  const aspectRatio = getAspectRatio(naturalWidth, naturalHeight);

  // Rich chat: same scale math as the preview — ignore editor container width so stored
  // size matches preview. CSS `maxWidth: 100%` handles narrow panels.
  if (fitToMaxBounds) {
    const scale = Math.min(
      1,
      (maxWidth ?? Number.POSITIVE_INFINITY) / naturalWidth,
      (maxHeight ?? Number.POSITIVE_INFINITY) / naturalHeight
    );

    return {
      width: Math.round(naturalWidth * scale),
      height: Math.round(naturalHeight * scale),
      aspectRatio,
    };
  }

  // Email / default: fit within the editor container (and optional max caps), never upscale.
  let width = Math.min(containerWidth, naturalWidth, maxWidth ?? Number.POSITIVE_INFINITY);
  let height = Math.min(getNewHeight(width, aspectRatio), naturalHeight);

  if (maxHeight != null && height > maxHeight) {
    height = Math.min(maxHeight, naturalHeight);
    width = Math.min(getNewWidth(height, aspectRatio), containerWidth, naturalWidth);
  }

  return { width, height, aspectRatio };
}

export type ImageStatus = 'idle' | 'loading' | 'loaded' | 'error';

export function ImageView(props: NodeViewProps) {
  const { node, selected, editor, updateAttributes } = props;

  const [status, setStatus] = useState<ImageStatus>('idle');
  const [isPlaceholderImage, setIsPlaceholderImage] = useState(false);

  const { onImageUpload, allowedMimeTypes = [] } = useImageUploadOptions(editor);
  const isResizable = getNodeOptions<ImageExtensionOptions>(editor, 'image')?.resizable !== false;

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [resizingStyle, setResizingStyle] = useState<Pick<CSSProperties, 'width' | 'height'> | undefined>();

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleMouseDown = useEvent((event: React.MouseEvent<HTMLDivElement>) => {
    const imageParent = document.querySelector('.ProseMirror-selectednode') as HTMLDivElement;

    if (!isResizable || !imgRef.current || !imageParent || !selected) {
      return;
    }

    const imageParentWidth = Math.max(imageParent.offsetWidth, IMAGE_MAX_WIDTH);

    event.preventDefault();
    const direction = event.currentTarget.dataset.direction || '--';
    const initialXPosition = event.clientX;
    const initialYPosition = event.clientY;
    const currentWidth = imgRef.current.width;
    const currentHeight = imgRef.current.height;
    let newWidth = currentWidth;
    let newHeight = currentHeight;
    const transformX = direction[1] === 'w' ? -1 : 1;
    const transformY = direction[0] === 'n' ? -1 : 1;

    const removeListeners = () => {
      window.removeEventListener('mousemove', mouseMoveHandler);
      window.removeEventListener('mouseup', removeListeners);
      const aspectRatio = getAspectRatio(newWidth, newHeight);
      editor
        .chain()
        .updateImageAttributes({
          width: newWidth,
          height: newHeight,
          aspectRatio,
        })
        .run();
      setResizingStyle(undefined);
    };

    const mouseMoveHandler = (event: MouseEvent) => {
      newWidth = Math.max(currentWidth + transformX * (event.clientX - initialXPosition), MIN_WIDTH);
      newHeight = Math.max(currentHeight + transformY * (event.clientY - initialYPosition), MIN_WIDTH);

      if (newWidth > imageParentWidth) {
        newWidth = imageParentWidth;
      }
      if (newHeight > IMAGE_MAX_HEIGHT) {
        newHeight = IMAGE_MAX_HEIGHT;
      }

      // If aspect ratio is locked, calculate height based on aspect ratio
      if (node.attrs.lockAspectRatio) {
        const aspectRatio = node.attrs.aspectRatio ? node.attrs.aspectRatio : getAspectRatio(newWidth, newHeight);
        newHeight = getNewHeight(newWidth, aspectRatio);
      }

      setResizingStyle({ width: newWidth, height: newHeight });
      // If mouse is up, remove event listeners
      if (!event.buttons) {
        return removeListeners();
      }
    };

    window.addEventListener('mousemove', mouseMoveHandler);
    window.addEventListener('mouseup', removeListeners);
  });

  const dragCornerButton = useCallback(
    (direction: string) => {
      if (!isResizable || isPlaceholderImage) {
        return null;
      }

      return (
        <div
          role="button"
          tabIndex={0}
          onMouseDown={handleMouseDown}
          data-direction={direction}
          className="mly-bg-rose-500"
          style={{
            position: 'absolute',
            height: '10px',
            width: '10px',
            ...{ n: { top: 0 }, s: { bottom: 0 } }[direction[0]],
            ...{ w: { left: 0 }, e: { right: 0 } }[direction[1]],
            cursor: `${direction}-resize`,
          }}
        />
      );
    },
    [handleMouseDown, isPlaceholderImage, isResizable]
  );

  const imageOptions = getNodeOptions<ImageExtensionOptions>(editor, 'image');
  const { alignment = imageOptions?.defaultAlignment ?? 'center', width, height, src, borderRadius } = node.attrs || {};

  const {
    externalLink,
    isExternalLinkVariable,
    isSrcVariable,
    showIfKey,
    aspectRatio: defaultAspectRatio,
    borderRadius: _,
    lockAspectRatio,
    ...attrs
  } = node.attrs || {};

  const hasImageSrc = !!attrs.src;
  const isDroppable = !!onImageUpload && editor.isEditable && !hasImageSrc && !isSrcVariable && status === 'idle';

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
        editor.chain().updateImageAttributes({ src: imageUrl }).run();
        setIsPlaceholderImage(false);
        setStatus('loaded');
      } catch (error) {
        console.error('Error uploading image:', error);
        setStatus('error');
      }
    },
    [onImageUpload]
  );

  // load the image using new Image() to avoid layout shift
  // then if the image is loaded, set the status to loaded
  useEffect(() => {
    if (!src || isSrcVariable) {
      return;
    }

    setStatus('loading');
    const isPlaceHolder = editor?.extensionStorage?.imageUpload?.placeholderImages?.has(src) ?? false;
    setIsPlaceholderImage(isPlaceHolder);
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setStatus('loaded');
      // for some reason Apple Mail doesn't respect the width and height attributes
      // update the dimensions to ensure that the image is not stretched
      const { naturalWidth, naturalHeight } = img;
      const wrapper = wrapperRef?.current;
      const imageOptions = getNodeOptions<ImageExtensionOptions>(editor, 'image');
      const fitToMaxBounds = imageOptions?.fitToMaxBounds === true;
      const numericWidth = width === 'auto' ? null : Number(width);
      const numericHeight = height === 'auto' ? null : Number(height);
      const exceedsMaxWidth =
        imageOptions?.maxWidth != null && numericWidth != null && numericWidth > imageOptions.maxWidth;
      const exceedsMaxHeight =
        imageOptions?.maxHeight != null && numericHeight != null && numericHeight > imageOptions.maxHeight;

      if (!wrapper || !naturalWidth) {
        return;
      }

      const {
        width: nextWidth,
        height: nextHeight,
        aspectRatio,
      } = fitImageWithinBounds({
        naturalWidth,
        naturalHeight,
        containerWidth: wrapper.offsetWidth,
        maxWidth: imageOptions?.maxWidth,
        maxHeight: imageOptions?.maxHeight,
        fitToMaxBounds,
      });

      // Chat (`fitToMaxBounds`): re-sync when attrs drift from preview math. Email: auto / overflow only.
      const sizeMismatch =
        fitToMaxBounds &&
        numericWidth != null &&
        numericHeight != null &&
        (Math.round(numericWidth) !== nextWidth || Math.round(numericHeight) !== nextHeight);
      const shouldFitSize = width === 'auto' || exceedsMaxWidth || exceedsMaxHeight || sizeMismatch;

      if (!shouldFitSize) {
        return;
      }

      // Use NodeView `updateAttributes` — `editor.chain().updateImageAttributes` only
      // touches the current selection, so unloaded/saved images would keep stale sizes.
      updateAttributes({
        width: nextWidth,
        height: nextHeight,
        aspectRatio,
      });
    };
    img.onerror = () => {
      setStatus('error');
    };

    return () => {
      img.src = '';
      img.onload = null;
      img.onerror = null;
    };
  }, [src]);

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

  return (
    <NodeViewWrapper
      as="div"
      draggable={editor.isEditable}
      data-drag-handle={editor.isEditable}
      className={cn('mly-image-drop-zone', isDraggingOver && 'mly-drag-over')}
      style={{
        ...(hasImageSrc && status === 'loaded'
          ? {
              width: width ? `${width}px` : undefined,
              height: height ? `${height}px` : undefined,
              ...resizingStyle,
            }
          : {}),
        overflow: 'hidden',
        position: 'relative',
        // Weird! Basically tiptap/prose wraps this in a span and the line height causes an annoying buffer.
        lineHeight: '0px',
        display: 'block',
        maxWidth: '100%',
        ...({
          center: { marginLeft: 'auto', marginRight: 'auto' },
          left: { marginRight: 'auto' },
          right: { marginLeft: 'auto' },
        }[alignment as string] || {}),
      }}
      ref={wrapperRef}
      {...(isDroppable
        ? {
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
          }
        : {})}
    >
      {!hasImageSrc && status === 'idle' && (
        <ImageStatusLabel status="idle" minHeight={height} isDropZone={isDroppable} />
      )}

      {!hasImageSrc && status === 'loading' && !isSrcVariable && (
        <ImageStatusLabel status="loading" minHeight={height} />
      )}

      {hasImageSrc && isSrcVariable && <ImageStatusLabel status="variable" minHeight={height} />}

      {hasImageSrc && status === 'loading' && !isSrcVariable && (
        <ImageStatusLabel status="loading" minHeight={height} />
      )}
      {hasImageSrc && status === 'error' && !isSrcVariable && <ImageStatusLabel status="error" minHeight={height} />}

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
        <>
          <img
            {...attrs}
            ref={imgRef}
            style={{
              ...resizingStyle,
              cursor: 'default',
              objectFit: 'fill',
              marginBottom: 0,
              borderRadius,
              width: resizingStyle?.width ? `${resizingStyle.width}px` : width ? `${width}px` : 'auto',
              height: resizingStyle?.height ? `${resizingStyle.height}px` : height ? `${height}px` : 'auto',
              maxWidth: '100%',
            }}
            draggable={editor.isEditable}
            className={cn(isPlaceholderImage && 'mly-animate-pulse mly-opacity-40')}
          />

          {selected && editor.isEditable && !isPlaceholderImage && (
            <>
              {/* Don't use a simple border as it pushes other content around. */}
              {[
                { left: 0, top: 0, height: '100%', width: '1px' },
                { right: 0, top: 0, height: '100%', width: '1px' },
                { top: 0, left: 0, width: '100%', height: '1px' },
                { bottom: 0, left: 0, width: '100%', height: '1px' },
              ].map((style, i) => (
                <div
                  key={i}
                  className="mly-bg-rose-500"
                  style={{
                    position: 'absolute',
                    ...style,
                  }}
                />
              ))}
              {isResizable && (
                <>
                  {dragCornerButton('nw')}
                  {dragCornerButton('ne')}
                  {dragCornerButton('sw')}
                  {dragCornerButton('se')}
                </>
              )}
            </>
          )}
        </>
      )}
    </NodeViewWrapper>
  );
}

type ImageStatusLabelProps = {
  status: ImageStatus | 'variable';
  minHeight?: number | string;
  isDropZone?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function ImageStatusLabel(props: ImageStatusLabelProps) {
  const { status, minHeight, className, style, isDropZone, ...rest } = props;

  return (
    <div
      {...rest}
      className={cn(
        'mly-flex mly-items-center mly-justify-center mly-gap-2 mly-rounded-lg mly-bg-soft-gray mly-px-4 mly-py-2 mly-text-sm mly-font-medium',
        {
          'mly-text-gray-500 hover:mly-bg-soft-gray/60': status === 'loading',
          'mly-text-red-500 hover:mly-bg-soft-gray/60': status === 'error',
        },
        className
      )}
      style={{
        ...(minHeight
          ? {
              minHeight,
            }
          : {}),
        ...style,
      }}
    >
      {status === 'idle' && !isDropZone && (
        <>
          <ImageOffIcon className="mly-size-4 mly-stroke-[2.5]" />
          <span>No image selected</span>
        </>
      )}

      {status === 'idle' && isDropZone && (
        <>
          <GrabIcon className="mly-size-4 mly-stroke-[2.5]" />
          <span>Click or Drop image here</span>
        </>
      )}

      {status === 'loading' && (
        <>
          <Loader2 className="mly-size-4 mly-animate-spin mly-stroke-[2.5]" />
          <span>Loading image...</span>
        </>
      )}
      {status === 'error' && (
        <>
          <Ban className="mly-size-4 mly-stroke-[2.5]" />
          <span>Error loading image</span>
        </>
      )}
      {status === 'variable' && (
        <>
          <BracesIcon className="mly-size-4 mly-stroke-[2.5]" />
          <span>Variable Image URL</span>
        </>
      )}
    </div>
  );
}

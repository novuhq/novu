import { type NodeViewProps, NodeViewWrapper } from '@tiptap/react';
import { Ban, BracesIcon, ImageOffIcon, ImageUpIcon, Loader2 } from 'lucide-react';
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useImageUploadOptions } from '@/editor/extensions/image-upload/image-upload';
import { getAspectRatio, getNewHeight } from '@/editor/utils/aspect-ratio';
import { cn } from '@/editor/utils/classname';
import { useEvent } from '@/editor/utils/use-event';

const MIN_WIDTH = 20;
export const IMAGE_MAX_WIDTH = 600;
export const IMAGE_MAX_HEIGHT = 400;

export type ImageStatus = 'idle' | 'loading' | 'loaded' | 'error';

export function ImageView(props: NodeViewProps) {
  const { node, selected, editor, updateAttributes } = props;

  const [status, setStatus] = useState<ImageStatus>('idle');
  const [isPlaceholderImage, setIsPlaceholderImage] = useState(false);

  const { onImageUpload, allowedMimeTypes = [] } = useImageUploadOptions(editor);

  const wrapperRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const [resizingStyle, setResizingStyle] = useState<Pick<CSSProperties, 'width' | 'height'> | undefined>();

  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const handleMouseDown = useEvent((event: React.MouseEvent<HTMLDivElement>) => {
    const imageParent = document.querySelector('.ProseMirror-selectednode') as HTMLDivElement;

    if (!imgRef.current || !imageParent || !selected) {
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
      if (isPlaceholderImage) {
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
    [handleMouseDown, isPlaceholderImage]
  );

  const { alignment = 'center', width, height, src, borderRadius } = node.attrs || {};

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

  const acceptedTypesHint = useMemo(() => {
    if (allowedMimeTypes.length === 0) {
      return undefined;
    }

    const names = allowedMimeTypes.map((mime) => {
      const subtype = mime.split('/')[1] ?? mime;
      return subtype.replace('+xml', '').toUpperCase();
    });

    return names.length > 1 ? `${names.slice(0, -1).join(', ')} or ${names[names.length - 1]}` : names[0];
  }, [allowedMimeTypes]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isDroppable || !e.target.files || e.target.files.length === 0) {
      return;
    }

    const file = e.target.files[0];
    // Clear the input so picking the same file again re-triggers onChange
    // (e.g. retrying after a failed upload).
    e.target.value = '';
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
        // Use the node view's position-tracked updateAttributes instead of the
        // selection-based updateImageAttributes command: by the time the upload
        // resolves, the selection may have left this image node (file dialog focus
        // loss, clicks), which would silently drop the src update.
        updateAttributes({ src: imageUrl });
        setIsPlaceholderImage(false);
        setStatus('loaded');
      } catch (error) {
        console.error('Error uploading image:', error);
        // Return to the droppable state so the drop zone reappears and the user
        // can retry — the 'error' status renders nothing when the node has no src.
        setStatus('idle');
      }
    },
    [onImageUpload, updateAttributes]
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

      if (!wrapper || width !== 'auto' || !naturalWidth) {
        return;
      }

      const wrapperWidth = wrapper.offsetWidth;
      const aspectRatio = getAspectRatio(naturalWidth, naturalHeight);
      const calculatedHeight = Math.min(getNewHeight(wrapperWidth, aspectRatio), naturalHeight);

      // Position-tracked update — img.onload fires async, so the selection may no
      // longer be on this node (see handleImageUpload above).
      updateAttributes({
        width: Math.min(wrapperWidth, naturalWidth),
        height: Math.min(calculatedHeight, naturalHeight),
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
        <ImageStatusLabel status="idle" minHeight={height} isDropZone={isDroppable} hint={acceptedTypesHint} />
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
              {dragCornerButton('nw')}
              {dragCornerButton('ne')}
              {dragCornerButton('sw')}
              {dragCornerButton('se')}
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
  /**
   * Secondary line shown under the drop-zone prompt (e.g. accepted file types).
   * When provided, the drop zone renders as a spacious stacked layout; without
   * it, a compact single row is used (e.g. the logo slot).
   */
  hint?: string;
} & React.HTMLAttributes<HTMLDivElement>;

export function ImageStatusLabel(props: ImageStatusLabelProps) {
  const { status, minHeight, className, style, isDropZone, hint, ...rest } = props;

  const isUploadZone = status === 'idle' && isDropZone;
  const isStackedUploadZone = isUploadZone && !!hint;

  return (
    <div
      {...rest}
      className={cn(
        'mly-flex mly-items-center mly-justify-center mly-gap-2 mly-rounded-lg mly-text-sm mly-font-medium mly-leading-normal',
        isUploadZone
          ? 'mly-border mly-border-dashed mly-border-gray-300 mly-bg-gray-50 mly-text-gray-600 mly-transition-colors hover:mly-border-gray-400 hover:mly-bg-gray-100'
          : 'mly-bg-soft-gray',
        isStackedUploadZone ? 'mly-flex-col mly-gap-3 mly-px-6 mly-py-10' : 'mly-px-4 mly-py-2',
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

      {isUploadZone &&
        (isStackedUploadZone ? (
          <>
            <div className="mly-flex mly-size-10 mly-items-center mly-justify-center mly-rounded-full mly-border mly-border-gray-200 mly-bg-white mly-shadow-sm">
              <ImageUpIcon className="mly-size-[18px] mly-stroke-[1.75] mly-text-gray-500" />
            </div>
            <div className="mly-flex mly-flex-col mly-items-center mly-gap-0.5 mly-text-center">
              <span className="mly-text-sm mly-font-medium mly-text-gray-700">
                Click to upload <span className="mly-font-normal mly-text-gray-500">or drag and drop</span>
              </span>
              <span className="mly-text-xs mly-font-normal mly-text-gray-400">{hint}</span>
            </div>
          </>
        ) : (
          <>
            <ImageUpIcon className="mly-size-4 mly-stroke-[2]" />
            <span>Click or drop image here</span>
          </>
        ))}

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

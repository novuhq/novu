/** biome-ignore-all lint/correctness/useHookAtTopLevel: needs to be fixed */
import { BubbleMenu } from '@tiptap/react';
import { ImageDown, LockIcon, LockOpenIcon } from 'lucide-react';
import { sticky } from 'tippy.js';
import { IMAGE_MAX_WIDTH } from '@/editor/nodes/image/image-view';
import { AllowedLogoSize, allowedLogoSize } from '@/editor/nodes/logo/logo';
import { getNewHeight, getNewWidth } from '@/editor/utils/aspect-ratio';
import { borderRadius } from '@/editor/utils/border-radius';
import { AlignmentSwitch } from '../alignment-switch';
import { BubbleMenuButton } from '../bubble-menu-button';
import { ShowPopover } from '../show-popover';
import { EditorBubbleMenuProps } from '../text-menu/text-bubble-menu';
import { Divider } from '../ui/divider';
import { LinkInputPopover } from '../ui/link-input-popover';
import { Select } from '../ui/select';
import { TooltipProvider } from '../ui/tooltip';
import { ImageSize } from './image-size';
import { useImageState } from './use-image-state';

export function ImageBubbleMenu(props: EditorBubbleMenuProps) {
  const { editor, appendTo } = props;
  if (!editor) {
    return null;
  }

  const state = useImageState(editor);

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    ...(appendTo ? { appendTo: appendTo.current } : {}),
    shouldShow: ({ editor }) => {
      if (!editor.isEditable || editor.view.dragging) {
        return false;
      }

      return editor.isActive('logo') || editor.isActive('image');
    },
    tippyOptions: {
      popperOptions: {
        modifiers: [{ name: 'flip', enabled: false }],
      },
      plugins: [sticky],
      sticky: 'popper',
      maxWidth: '100%',
    },
  };

  const { lockAspectRatio } = state;

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      className="mly-flex mly-rounded-lg mly-border mly-border-gray-200 mly-bg-white mly-p-0.5 mly-shadow-md"
    >
      <TooltipProvider>
        {state.isLogoActive && state.imageSrc && (
          <>
            <Select
              label="Size"
              tooltip="Size"
              value={state.logoSize}
              options={allowedLogoSize.map((size) => ({
                value: size,
                label: size,
              }))}
              onValueChange={(value) => {
                editor
                  ?.chain()
                  .focus()
                  .updateLogoAttributes({ size: value as AllowedLogoSize })
                  .run();
              }}
            />

            <Divider />
          </>
        )}

        <div className="mly-flex mly-space-x-0.5">
          <AlignmentSwitch
            alignment={state.alignment}
            onAlignmentChange={(alignment) => {
              const isCurrentNodeImage = state.isImageActive;
              if (!isCurrentNodeImage) {
                editor?.chain().focus().updateLogoAttributes({ alignment }).run();
              } else {
                editor?.chain().focus().updateImageAttributes({ alignment }).run();
              }
            }}
          />

          <LinkInputPopover
            defaultValue={state?.imageSrc ?? ''}
            onValueChange={(value, isVariable) => {
              if (state.isLogoActive) {
                editor
                  ?.chain()
                  .updateLogoAttributes({
                    src: value,
                    isSrcVariable: isVariable ?? false,
                  })
                  .run();
              } else {
                editor
                  ?.chain()
                  .updateImageAttributes({
                    src: value,
                    isSrcVariable: isVariable ?? false,
                  })
                  .run();
              }
            }}
            tooltip="Source URL"
            icon={ImageDown}
            editor={editor}
            isVariable={state.isSrcVariable}
          />

          {state.isImageActive && (
            <LinkInputPopover
              defaultValue={state?.imageExternalLink ?? ''}
              onValueChange={(value, isVariable) => {
                editor
                  ?.chain()
                  .updateImageAttributes({
                    externalLink: value,
                    isExternalLinkVariable: isVariable ?? false,
                  })
                  .run();
              }}
              tooltip="External URL"
              editor={editor}
              isVariable={state.isExternalLinkVariable}
            />
          )}
        </div>

        {state.isImageActive && state.imageSrc && (
          <>
            <Divider />

            <Select
              label="Border Radius"
              value={state?.borderRadius}
              options={borderRadius.map((value) => ({
                value: String(value.value),
                label: value.name,
              }))}
              onValueChange={(value) => {
                editor
                  ?.chain()
                  .updateImageAttributes({
                    borderRadius: Number(value),
                  })
                  .run();
              }}
              tooltip="Border Radius"
              className="mly-capitalize"
            />

            <div className="mly-flex mly-space-x-0.5">
              <ImageSize
                dimension="width"
                value={state?.width ?? ''}
                onValueChange={(value) => {
                  const width = Math.min(Number(value) || 0, IMAGE_MAX_WIDTH);
                  const currentHeight = Number(state.height) || 0;
                  const currentWidth = Number(state.width) || 0;
                  const currentAspectRatio = state.aspectRatio || currentWidth / currentHeight || 1;

                  editor
                    ?.chain()
                    .updateImageAttributes({
                      width: String(width),
                      ...(lockAspectRatio && value
                        ? {
                            height: String(getNewHeight(width, currentAspectRatio)),
                          }
                        : {}),
                    })
                    .run();
                }}
              />
              <ImageSize
                dimension="height"
                value={state?.height ?? ''}
                onValueChange={(value) => {
                  const height = Number(value) || 0;
                  const currentHeight = Number(state.height) || 0;
                  const currentWidth = Number(state.width) || 0;
                  const currentAspectRatio = state.aspectRatio || currentWidth / currentHeight || 1;

                  editor
                    ?.chain()
                    .updateImageAttributes({
                      height: String(height),
                      ...(lockAspectRatio && value
                        ? {
                            width: String(getNewWidth(height, currentAspectRatio)),
                          }
                        : {}),
                    })
                    .run();
                }}
              />

              <BubbleMenuButton
                isActive={() => lockAspectRatio}
                command={() => {
                  const width = Number(state.width) || 0;
                  const height = Number(state.height) || 0;
                  const aspectRatio = width / height;

                  editor
                    ?.chain()
                    .updateImageAttributes({
                      lockAspectRatio: !lockAspectRatio,
                      aspectRatio,
                    })
                    .run();
                }}
                icon={lockAspectRatio ? LockIcon : LockOpenIcon}
                tooltip="Lock Aspect Ratio"
              />
            </div>
          </>
        )}

        <Divider />
        <ShowPopover
          showIfKey={state.currentShowIfKey}
          onShowIfKeyValueChange={(value) => {
            if (state.isLogoActive) {
              editor
                ?.chain()
                .updateLogoAttributes({
                  showIfKey: value,
                })
                .run();
              return;
            }

            editor
              ?.chain()
              .updateImageAttributes({
                showIfKey: value,
              })
              .run();
          }}
          editor={editor}
        />
      </TooltipProvider>
    </BubbleMenu>
  );
}

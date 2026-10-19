/** biome-ignore-all lint/correctness/useHookAtTopLevel: needs to be fixed */
import { BubbleMenu, findChildren } from '@tiptap/react';
import { ChevronUp, Trash } from 'lucide-react';
import { useCallback } from 'react';
import { sticky } from 'tippy.js';
import { getClosestNodeByName } from '@/editor/utils/columns';
import { deleteNode } from '@/editor/utils/delete-node';
import { isTextSelected } from '@/editor/utils/is-text-selected';
import { spacing } from '@/editor/utils/spacing';
import { getRenderContainer } from '../../utils/get-render-container';
import { AlignmentSwitch } from '../alignment-switch';
import { BaseButton } from '../base-button';
import { BubbleMenuButton } from '../bubble-menu-button';
import { ColumnsBubbleMenuContent } from '../column-menu/columns-bubble-menu-content';
import { BorderColor } from '../icons/border-color';
import { MarginIcon } from '../icons/margin-icon';
import { PaddingIcon } from '../icons/padding-icon';
import { Popover, PopoverContent, PopoverTrigger } from '../popover';
import { ShowPopover } from '../show-popover';
import { EditorBubbleMenuProps } from '../text-menu/text-bubble-menu';
import { ColorPicker } from '../ui/color-picker';
import { Divider } from '../ui/divider';
import { Select } from '../ui/select';
import { TooltipProvider } from '../ui/tooltip';
import { useSectionState } from './use-section-state';

export function SectionBubbleMenu(props: EditorBubbleMenuProps) {
  const { appendTo, editor } = props;
  if (!editor) {
    return null;
  }

  const getReferenceClientRect = useCallback(() => {
    const renderContainer = getRenderContainer(editor!, 'section');
    const rect = renderContainer?.getBoundingClientRect() || new DOMRect(-1000, -1000, 0, 0);

    return rect;
  }, [editor]);

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    ...(appendTo ? { appendTo: appendTo.current } : {}),
    shouldShow: ({ editor }) => {
      if (editor.view.dragging) {
        return false;
      }

      const activeSectionNode = getClosestNodeByName(editor, 'section');
      const repeatNodeChildren = activeSectionNode
        ? findChildren(activeSectionNode?.node, (node) => {
            return node.type.name === 'repeat';
          })?.[0]
        : null;
      const inlineImageNodeChildren = activeSectionNode
        ? findChildren(activeSectionNode?.node, (node) => {
            return node.type.name === 'inlineImage';
          })?.[0]
        : null;
      const hasActiveRepeatNodeChildren = repeatNodeChildren && editor.isActive('repeat');
      const hasActiveInlineImageNodeChildren = inlineImageNodeChildren && editor.isActive('inlineImage');

      if (
        isTextSelected(editor) ||
        hasActiveRepeatNodeChildren ||
        hasActiveInlineImageNodeChildren ||
        !editor.isEditable
      ) {
        return false;
      }

      return editor.isActive('section');
    },
    tippyOptions: {
      offset: [0, 8],
      popperOptions: {
        modifiers: [{ name: 'flip', enabled: false }],
      },
      getReferenceClientRect,
      appendTo: () => appendTo?.current,
      plugins: [sticky],
      sticky: 'popper',
      maxWidth: 'auto',
    },
    pluginKey: 'sectionBubbleMenu',
  };

  const state = useSectionState(editor);

  const borderRadiusOptions = [
    { value: '0', label: 'Sharp' },
    { value: '6', label: 'Smooth' },
    { value: '9999', label: 'Round' },
  ];

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      className="mly-flex mly-items-stretch mly-rounded-lg mly-border mly-border-gray-200 mly-bg-white mly-p-0.5 mly-shadow-md"
    >
      <TooltipProvider>
        <AlignmentSwitch
          alignment={state.currentAlignment}
          onAlignmentChange={(alignment) => {
            editor?.commands?.updateSection({
              align: alignment,
            });
          }}
        />

        <Divider />

        <div className="mly-flex mly-space-x-0.5">
          <Select
            label="Border Radius"
            value={String(state.currentBorderRadius)}
            options={borderRadiusOptions}
            onValueChange={(value) => {
              editor?.commands?.updateSection({
                borderRadius: Number(value),
              });
            }}
            tooltip="Border Radius"
            className="mly-capitalize"
          />

          <Select
            label="Border Width"
            value={String(state.currentBorderWidth)}
            options={[
              { value: '0', label: 'None' },
              { value: '1', label: 'Thin' },
              { value: '2', label: 'Medium' },
              { value: '3', label: 'Thick' },
            ]}
            onValueChange={(value) => {
              editor?.commands?.updateSection({
                borderWidth: Number(value),
              });
            }}
            tooltip="Border Width"
            className="mly-capitalize"
          />
        </div>

        <Divider />

        <Select
          icon={MarginIcon}
          iconClassName="mly-stroke-[1.2] mly-size-3.5"
          label="Margin"
          value={String(state.currentMarginTop)}
          options={[
            { value: '0', label: 'None' },
            ...spacing.map((space) => ({
              label: space.name,
              value: String(space.value),
            })),
          ]}
          onValueChange={(_value) => {
            const value = Number(_value);
            editor?.commands?.updateSection({
              marginTop: value,
              marginRight: value,
              marginBottom: value,
              marginLeft: value,
            });
          }}
          tooltip="Margin"
          className="mly-capitalize"
        />

        <Divider />

        <Select
          icon={PaddingIcon}
          iconClassName="mly-stroke-[1]"
          label="Padding"
          value={String(state.currentPaddingTop)}
          options={[
            { value: '0', label: 'None' },
            ...spacing.map((space) => ({
              label: space.name,
              value: String(space.value),
            })),
          ]}
          onValueChange={(_value) => {
            const value = Number(_value);
            editor?.commands?.updateSection({
              paddingTop: value,
              paddingRight: value,
              paddingBottom: value,
              paddingLeft: value,
            });
          }}
          tooltip="Padding"
          className="mly-capitalize"
        />

        <Divider />

        <div className="mly-flex mly-space-x-0.5">
          <ColorPicker
            color={state.currentBorderColor}
            onColorChange={(color) => {
              editor?.commands?.updateSection({
                borderColor: color,
              });
            }}
            tooltip="Border Color"
          >
            <BaseButton variant="ghost" className="!mly-size-7 mly-shrink-0" size="sm" type="button">
              <BorderColor
                className="mly-size-3 mly-shrink-0"
                topBarClassName="mly-stroke-midnight-gray"
                style={{
                  color: state.currentBorderColor,
                }}
              />
            </BaseButton>
          </ColorPicker>
          <ColorPicker
            color={state.currentBackgroundColor}
            onColorChange={(color) => {
              editor?.commands?.updateSection({
                backgroundColor: color,
              });
            }}
            backgroundColor={state.currentBackgroundColor}
            tooltip="Background Color"
            className="mly-rounded-full mly-border-[1.5px] mly-border-white mly-shadow"
          />
        </div>

        <Divider />

        <BubbleMenuButton
          icon={Trash}
          tooltip="Delete Section"
          command={() => {
            deleteNode(editor, 'section');
          }}
        />

        <Divider />

        <ShowPopover
          showIfKey={state.currentShowIfKey}
          onShowIfKeyValueChange={(value) => {
            editor.commands.updateSection({
              showIfKey: value,
            });
          }}
          editor={editor}
        />

        {state.isColumnsActive && (
          <>
            <Divider />
            <Popover>
              <PopoverTrigger className="mly-flex mly-items-center mly-gap-1 mly-rounded-md mly-px-1.5 mly-text-sm data-[state=open]:mly-bg-soft-gray hover:mly-bg-soft-gray">
                Column
                <ChevronUp className="mly-h-3 mly-w-3" />
              </PopoverTrigger>
              <PopoverContent
                className="mly-w-max mly-rounded-lg !mly-p-0.5"
                side="top"
                sideOffset={8}
                align="end"
                onOpenAutoFocus={(e) => {
                  e.preventDefault();
                }}
                onCloseAutoFocus={(e) => {
                  e.preventDefault();
                }}
              >
                <ColumnsBubbleMenuContent editor={editor} />
              </PopoverContent>
            </Popover>
          </>
        )}
      </TooltipProvider>
    </BubbleMenu>
  );
}

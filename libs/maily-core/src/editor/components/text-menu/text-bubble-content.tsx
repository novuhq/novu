import { Editor } from '@tiptap/core';
import {
  BoldIcon,
  CodeIcon,
  ItalicIcon,
  List,
  ListOrdered,
  LucideIcon,
  StrikethroughIcon,
  UnderlineIcon,
} from 'lucide-react';
import { AlignmentSwitch } from '../alignment-switch';
import { BaseButton } from '../base-button';
import { BubbleMenuButton } from '../bubble-menu-button';
import { ColorPicker } from '../ui/color-picker';
import { Divider } from '../ui/divider';
import { LinkInputPopover } from '../ui/link-input-popover';
import { BubbleMenuItem } from './text-bubble-menu';
import { useTextMenuState } from './use-text-menu-state';

type TextBubbleContentProps = {
  editor: Editor;
  showListMenu?: boolean;
};

export function TextBubbleContent(props: TextBubbleContentProps) {
  const { editor, showListMenu = true } = props;

  const state = useTextMenuState(editor);
  const colors = editor?.storage.color.colors as Set<string>;
  const suggestedColors = Array?.from(colors)?.reverse()?.slice(0, 6) ?? [];

  const items: BubbleMenuItem[] = [
    {
      name: 'bold',
      isActive: () => editor?.isActive('bold')!,
      command: () => editor?.chain().focus().toggleBold().run()!,
      icon: BoldIcon,
      tooltip: 'Bold',
    },
    {
      name: 'italic',
      isActive: () => editor?.isActive('italic')!,
      command: () => editor?.chain().focus().toggleItalic().run()!,
      icon: ItalicIcon,
      tooltip: 'Italic',
    },
    {
      name: 'underline',
      isActive: () => editor?.isActive('underline')!,
      command: () => editor?.chain().focus().toggleUnderline().run()!,
      icon: UnderlineIcon,
      tooltip: 'Underline',
    },
    {
      name: 'strike',
      isActive: () => editor?.isActive('strike')!,
      command: () => editor?.chain().focus().toggleStrike().run()!,
      icon: StrikethroughIcon,
      tooltip: 'Strikethrough',
    },
    {
      name: 'code',
      isActive: () => editor?.isActive('code')!,
      command: () => editor?.chain().focus().toggleCode().run()!,
      icon: CodeIcon,
      tooltip: 'Code',
    },
  ];

  return (
    <>
      {items.map((item, index) => (
        <BubbleMenuButton key={index} {...item} />
      ))}

      <AlignmentSwitch
        alignment={state.textAlign}
        onAlignmentChange={(alignment) => {
          editor?.chain().focus().setTextAlign(alignment).run();
        }}
      />

      {!state.isListActive && showListMenu && (
        <>
          <BubbleMenuButton
            icon={List}
            command={() => {
              editor.chain().focus().toggleBulletList().run();
            }}
            tooltip="Bullet List"
          />
          <BubbleMenuButton
            icon={ListOrdered}
            command={() => {
              editor.chain().focus().toggleOrderedList().run();
            }}
            tooltip="Ordered List"
          />
        </>
      )}

      <LinkInputPopover
        defaultValue={state?.linkUrl ?? ''}
        onValueChange={(value, isVariable) => {
          editor?.commands.updateLinkAttributes({
            href: value,
            isUrlVariable: isVariable ?? false,
          });
        }}
        tooltip="External URL"
        editor={editor}
        isVariable={state.isUrlVariable}
      />

      <Divider />

      <ColorPicker
        color={state.currentTextColor}
        onColorChange={(color) => {
          editor?.chain().setColor(color).run();
        }}
        tooltip="Text Color"
        suggestedColors={suggestedColors}
      >
        <BaseButton variant="ghost" size="sm" type="button" className="!mly-h-7 mly-w-7 mly-shrink-0 mly-p-0">
          <div className="mly-flex mly-flex-col mly-items-center mly-justify-center mly-gap-[1px]">
            <span className="mly-font-bolder mly-font-mono mly-text-xs mly-text-slate-700">A</span>
            <div className="mly-h-[2px] mly-w-3" style={{ backgroundColor: state.currentTextColor }} />
          </div>
        </BaseButton>
      </ColorPicker>
    </>
  );
}

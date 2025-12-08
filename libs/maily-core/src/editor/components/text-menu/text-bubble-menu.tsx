/** biome-ignore-all lint/correctness/useHookAtTopLevel: needs to be fixed */
import { BubbleMenu, BubbleMenuProps } from '@tiptap/react';
import { LucideIcon } from 'lucide-react';
import { sticky } from 'tippy.js';
import { ColumnExtension } from '@/editor/nodes/columns/column';
import { ColumnsExtension } from '@/editor/nodes/columns/columns';
import { RepeatExtension } from '@/editor/nodes/repeat/repeat';
import { SectionExtension } from '@/editor/nodes/section/section';
import { isCustomNodeSelected } from '@/editor/utils/is-custom-node-selected';
import { isTextSelected } from '@/editor/utils/is-text-selected';
import { SVGIcon } from '../icons/grid-lines';
import { Divider } from '../ui/divider';
import { TooltipProvider } from '../ui/tooltip';
import { TextBubbleContent } from './text-bubble-content';
import { TurnIntoBlock } from './turn-into-block';
import { useTurnIntoBlockOptions } from './use-turn-into-block-options';

export interface BubbleMenuItem {
  name?: string;
  isActive?: () => boolean;
  command?: () => void;
  shouldShow?: () => boolean;
  icon?: LucideIcon | SVGIcon;
  className?: string;
  iconClassName?: string;
  nameClassName?: string;
  disabled?: boolean;

  tooltip?: string;
}

export type EditorBubbleMenuProps = Omit<BubbleMenuProps, 'children'> & {
  appendTo?: React.RefObject<any>;
};

export function TextBubbleMenu(props: EditorBubbleMenuProps) {
  const { editor, appendTo } = props;

  if (!editor) {
    return null;
  }

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    ...(appendTo ? { appendTo: appendTo.current } : {}),
    pluginKey: 'text-menu',
    shouldShow: ({ editor, from, view }) => {
      if (!view || editor.view.dragging) {
        return false;
      }

      const domAtPosResult = view.domAtPos(from || 0);
      if (!domAtPosResult) return false;

      const domAtPos = domAtPosResult.node as HTMLElement;
      const nodeDOM = view.nodeDOM(from || 0) as HTMLElement;
      const node = nodeDOM || domAtPos;

      if (isCustomNodeSelected(editor, node) || !editor.isEditable) {
        return false;
      }

      const nestedNodes = [RepeatExtension.name, SectionExtension.name, ColumnsExtension.name, ColumnExtension.name];

      const isNestedNodeSelected =
        nestedNodes.some((name) => editor.isActive(name)) && node?.classList?.contains('ProseMirror-selectednode');
      return isTextSelected(editor) && !isNestedNodeSelected;
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

  const turnIntoBlockOptions = useTurnIntoBlockOptions(editor);

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      className="mly-flex mly-gap-0.5 mly-rounded-lg mly-border mly-border-gray-200 mly-bg-white mly-p-0.5 mly-shadow-md"
    >
      <TooltipProvider>
        <TurnIntoBlock options={turnIntoBlockOptions} />

        <Divider className="mly-mx-0" />

        <TextBubbleContent editor={editor} />
      </TooltipProvider>
    </BubbleMenu>
  );
}

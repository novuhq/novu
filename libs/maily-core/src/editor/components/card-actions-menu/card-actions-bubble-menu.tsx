import { BubbleMenu } from '@tiptap/react';
import { useCallback } from 'react';
import { sticky } from 'tippy.js';
import { findCardActions } from '@/editor/nodes/card-actions/card-actions';
import { isTextSelected } from '@/editor/utils/is-text-selected';
import { getRenderContainer } from '../../utils/get-render-container';
import { EditorBubbleMenuProps } from '../text-menu/text-bubble-menu';
import { TooltipProvider } from '../ui/tooltip';
import { CardActionsBubbleMenuContent } from './card-actions-bubble-menu-content';

export function CardActionsBubbleMenu(props: EditorBubbleMenuProps) {
  const { appendTo, editor } = props;
  if (!editor) {
    return null;
  }

  const getReferenceClientRect = useCallback(() => {
    const renderContainer = getRenderContainer(editor!, 'cardActions');
    const rect = renderContainer?.getBoundingClientRect() || new DOMRect(-1000, -1000, 0, 0);

    return rect;
  }, [editor]);

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    ...(appendTo ? { appendTo: appendTo.current } : {}),
    shouldShow: ({ editor }) => {
      if (editor.view.dragging || !editor.isEditable) {
        return false;
      }

      if (isTextSelected(editor)) {
        return false;
      }

      return !!findCardActions(editor);
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
    pluginKey: 'cardActionsBubbleMenu',
  };

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      className="mly-rounded-lg mly-border mly-border-gray-200 mly-bg-white mly-p-1 mly-shadow-md"
    >
      <TooltipProvider>
        <CardActionsBubbleMenuContent editor={editor} />
      </TooltipProvider>
    </BubbleMenu>
  );
}

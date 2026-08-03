import { BubbleMenu } from '@tiptap/react';
import { useCallback } from 'react';
import { sticky } from 'tippy.js';
import { findCardActions } from '@/editor/nodes/card-actions/card-actions';
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
    const renderContainer = getRenderContainer(editor, 'cardActions');
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

      // A `cardActions` row (or one of its buttons) must be selected. Note: a
      // NodeSelection is not a text selection, so `isTextSelected` is not used here.
      return !!findCardActions(editor);
    },
    tippyOptions: {
      // The actions form opens below the row (per design). Flip stays enabled so it
      // moves above when there isn't enough room below.
      placement: 'bottom-start',
      offset: [0, 8],
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

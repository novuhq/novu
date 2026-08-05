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

      // Match the email button: while Configure Variable is open, hide Actions so
      // only the variable popover is shown.
      if (editor.storage?.variable?.popover) {
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
      // Match dashboard PopoverContent (create-variable): fade + zoom-95 + slide.
      // TipTap BubbleMenu defaults to duration: 0; styles in `styles/index.css`.
      animation: 'popover',
      duration: [150, 100],
      // Keep the tippy open for nested menus / autocomplete that render outside fields.
      interactive: true,
      // Focus can move into nested dropdown items; don't dismiss Actions on blur.
      hideOnClick: false,
      onCreate: (instance) => {
        instance.popper.style.overflow = 'visible';
      },
    },
    pluginKey: 'cardActionsBubbleMenu',
  };

  return (
    <BubbleMenu
      {...bubbleMenuProps}
      className="mly-overflow-visible mly-rounded-md mly-border mly-border-[#f2f5f8] mly-bg-white mly-p-1 mly-shadow-[0px_1px_2px_0px_rgba(10,13,20,0.03)]"
    >
      <TooltipProvider>
        <CardActionsBubbleMenuContent editor={editor} />
      </TooltipProvider>
    </BubbleMenu>
  );
}

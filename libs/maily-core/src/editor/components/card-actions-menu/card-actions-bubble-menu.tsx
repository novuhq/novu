import { BubbleMenu } from '@tiptap/react';
import { useCallback, useEffect } from 'react';
import { sticky } from 'tippy.js';
import { dismissCardActionsMenu, findCardActions } from '@/editor/nodes/card-actions/card-actions';
import { getRenderContainer } from '../../utils/get-render-container';
import { EditorBubbleMenuProps } from '../text-menu/text-bubble-menu';
import { TooltipProvider } from '../ui/tooltip';
import { CardActionsBubbleMenuContent } from './card-actions-bubble-menu-content';

export function CardActionsBubbleMenu(props: EditorBubbleMenuProps) {
  const { appendTo, editor } = props;

  const getReferenceClientRect = useCallback(() => {
    if (!editor) {
      return new DOMRect(-1000, -1000, 0, 0);
    }

    const renderContainer = getRenderContainer(editor, 'cardActions');
    const rect = renderContainer?.getBoundingClientRect() || new DOMRect(-1000, -1000, 0, 0);

    return rect;
  }, [editor]);

  // Escape closes Actions unless a Configure Variable popover is handling Escape first.
  useEffect(() => {
    if (!editor) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') {
        return;
      }

      // Configure Variable owns Escape while open (incl. when layered on top of Actions).
      if (editor.storage?.variable?.popover) {
        return;
      }

      if (!findCardActions(editor)) {
        return;
      }

      event.preventDefault();
      dismissCardActionsMenu(editor);
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [editor]);

  if (!editor) {
    return null;
  }

  const bubbleMenuProps: EditorBubbleMenuProps = {
    ...props,
    ...(appendTo ? { appendTo: appendTo.current } : {}),
    shouldShow: ({ editor }) => {
      if (editor.view.dragging || !editor.isEditable) {
        return false;
      }

      // While a Configure Variable popover is open, hide Actions so only the variable popover shows
      // (same as the email button) — UNLESS it was opened from a Label/URL field pill, which flags
      // the bubble to stay mounted so the popover renders on top of it.
      if (editor.storage?.variable?.popover && !editor.storage?.variable?.keepCardActionsMenu) {
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
      // Visibility is selection-driven (`shouldShow`); Tippy hide alone would re-open on the next
      // transaction. Outside clicks clear the card selection instead (see `onClickOutside`).
      hideOnClick: false,
      onClickOutside: (_instance, event) => {
        // Configure Variable (portaled) is outside this tippy — don't steal its outside-click.
        if (editor.storage?.variable?.popover) {
          return;
        }

        const target = event.target as HTMLElement | null;

        // Clicks on the actions row / a button keep or retarget selection via node views.
        if (target?.closest('[data-type="cardActions"], [data-type="cardButton"]')) {
          return;
        }

        dismissCardActionsMenu(editor);
      },
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

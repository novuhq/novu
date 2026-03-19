import type { Editor } from '@tiptap/core';
import { ChevronRightIcon } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { BlockItem } from '@/blocks';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/editor/components/ui/tooltip';
import { cn } from '@/editor/utils/classname';

type SlashCommandItemProps = {
  item: BlockItem;
  groupIndex: number;
  commandIndex: number;
  selectedGroupIndex: number;
  selectedCommandIndex: number;
  editor: Editor;
  activeCommandRef: React.RefObject<HTMLButtonElement | null>;
  selectItem: (groupIndex: number, commandIndex: number) => void;
  hoveredItemKey: string | null;
  onHover: (isHovered: boolean) => void;
};

export function SlashCommandItem(props: SlashCommandItemProps) {
  const {
    item,
    groupIndex,
    commandIndex,
    selectedGroupIndex,
    selectedCommandIndex,
    editor,
    activeCommandRef,
    selectItem,
    hoveredItemKey,
    onHover,
  } = props;

  const [open, setOpen] = useState(false);
  const isActive = groupIndex === selectedGroupIndex && commandIndex === selectedCommandIndex;

  const itemKey = `${groupIndex}-${commandIndex}`;
  const isHovered = hoveredItemKey === itemKey;

  const isSubCommand = item && 'commands' in item;

  // show tooltip only if this item is hovered OR (active/keyboard selected AND no other item is hovered)
  const shouldOpenTooltip = !!item?.preview && (isHovered || (isActive && !hoveredItemKey));

  const hasRenderFunction = typeof item.render === 'function';
  const renderFunctionValue = hasRenderFunction ? item.render?.(editor) : null;

  let value = (
    <>
      <div className="mly-flex mly-h-6 mly-w-6 mly-shrink-0 mly-items-center mly-justify-center">{item.icon}</div>
      <div className="mly-grow">
        <p className="mly-font-medium">{item.title}</p>
        <p className="mly-text-xs mly-text-gray-400">{item.description}</p>
      </div>

      {isSubCommand && (
        <span className="mly-block mly-px-1 mly-text-gray-400">
          <ChevronRightIcon className="mly-size-3.5 mly-stroke-[2.5]" />
        </span>
      )}
    </>
  );

  if (renderFunctionValue !== null && renderFunctionValue !== true) {
    value = renderFunctionValue!;
  }

  const checkVisibility = useCallback(() => {
    const container = document.querySelector('#slash-command');
    if (!container) return false;

    // Find the button by a unique data attribute
    const button = container.querySelector(`[data-item-key="${itemKey}"]`);
    if (!button) return false;

    const buttonRect = button.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    // Check if the button is fully visible within the container
    return buttonRect.top >= containerRect.top && buttonRect.bottom <= containerRect.bottom;
  }, [itemKey]);

  useEffect(() => {
    const container = document.querySelector('#slash-command');
    if (!container) return;

    const handleScroll = () => {
      if (!checkVisibility() && open) {
        setOpen(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [open, checkVisibility]);

  const openTimerRef = useRef<number>(0);
  const handleDelayedOpen = useCallback(() => {
    window.clearTimeout(openTimerRef.current);
    const delay = 200;
    openTimerRef.current = window.setTimeout(() => {
      if (checkVisibility()) {
        setOpen(true);
      }
      openTimerRef.current = 0;
    }, delay);
  }, [checkVisibility]);

  useEffect(() => {
    if (shouldOpenTooltip) {
      handleDelayedOpen();
    } else {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = 0;
      setOpen(false);
    }
  }, [shouldOpenTooltip, handleDelayedOpen]);

  useEffect(() => {
    return () => {
      if (openTimerRef.current) {
        window.clearTimeout(openTimerRef.current);
        openTimerRef.current = 0;
      }
    };
  }, []);

  return (
    <Tooltip open={open}>
      <TooltipTrigger asChild>
        <button
          className={cn(
            'mly-flex mly-w-full mly-items-center mly-gap-2 mly-rounded-md mly-px-2 mly-py-1 mly-text-left mly-text-sm mly-text-gray-900 hover:mly-bg-gray-100 hover:mly-text-gray-900',
            isActive ? 'mly-bg-gray-100 mly-text-gray-900' : 'mly-bg-transparent'
          )}
          onClick={() => selectItem(groupIndex, commandIndex)}
          onMouseEnter={() => onHover(true)}
          onMouseLeave={() => onHover(false)}
          onMouseDown={(e) => e.preventDefault()}
          type="button"
          ref={isActive ? activeCommandRef : null}
          data-item-key={itemKey}
        >
          {value}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={10}
        className="mly-w-52 mly-rounded-lg mly-border-none mly-p-1 mly-shadow"
      >
        {typeof item.preview === 'function' ? (
          item?.preview(editor)
        ) : (
          <>
            <figure className="mly-relative mly-aspect-[2.5] mly-w-full mly-overflow-hidden mly-rounded-md mly-border mly-border-gray-200">
              <img
                src={item?.preview}
                alt={item?.title}
                className="mly-absolute mly-inset-0 mly-h-full mly-w-full mly-object-cover"
              />
            </figure>
            <p className="mly-mt-2 mly-px-0.5 mly-text-gray-500">{item.description}</p>
          </>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

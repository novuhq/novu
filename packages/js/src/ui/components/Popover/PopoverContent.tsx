import { autoUpdate, flip, offset, shift } from '@floating-ui/dom';
import { useFloating } from 'solid-floating-ui';
import { onCleanup, onMount, ParentComponent, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useAppearance } from '../../context';
import { usePopover } from './Popover';

export const PopoverContent: ParentComponent<{ classes: string }> = (props) => {
  const { setContentRef, opened, targetRef, onClose, contentRef, fallbackPlacements, placement } = usePopover();
  const { id } = useAppearance();

  const position = useFloating(targetRef, contentRef, {
    placement: placement || 'bottom-end',
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(10),
      flip({
        fallbackPlacements,
      }),
      shift(),
    ],
  });

  const handleClickOutside = (e: any) => {
    if (contentRef()?.contains(e.target)) return;
    onClose();
  };

  const handleEscapeKey = (e: any) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  onMount(() => {
    document.body.addEventListener('click', handleClickOutside);
    document.body.addEventListener('keydown', handleEscapeKey);
  });

  onCleanup(() => {
    document.body.removeEventListener('click', handleClickOutside);
    document.body.removeEventListener('keydown', handleEscapeKey);
  });

  return (
    <Show when={opened() && targetRef()}>
      <Portal mount={targetRef() as HTMLElement}>
        <div
          ref={setContentRef}
          class={`${props.classes} + ${id}`}
          style={{
            position: position.strategy,
            top: `${position.y ?? 0}px`,
            left: `${position.x ?? 0}px`,
          }}
          data-open={opened()}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
};

export const popoverContentClasses = () =>
  'nt-w-[400px] nt-h-[600px] nt-rounded-xl nt-bg-background nt-translate-y-0 nt-shadow-[0_5px_15px_0_rgba(122,133,153,0.25)] nt-z-[9999] nt-cursor-default nt-flex nt-flex-col nt-overflow-hidden';

export const dropdownContentClasses = () =>
  'nt-w-max nt-rounded-lg nt-shadow-[0_5px_20px_0_rgba(0,0,0,0.20)] nt-z-10 nt-bg-background nt-py-2';

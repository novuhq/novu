import { onCleanup, onMount, ParentComponent, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useStyle } from '../../helpers';
import { usePopover } from './Popover';
import { useFloating } from 'solid-floating-ui';

import { autoUpdate, offset, flip, shift } from '@floating-ui/dom';
export const PopoverContent: ParentComponent = (props) => {
  const style = useStyle();
  const { setContentRef, opened, targetRef, onClose, contentRef } = usePopover();

  const position = useFloating(targetRef, contentRef, {
    placement: 'bottom-end',
    whileElementsMounted: autoUpdate,

    middleware: [offset(10), flip(), shift()],
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
          id="novu-popover-content"
          ref={setContentRef}
          class={style(
            `nt-w-[400px] nt-h-[600px] nt-rounded-xl nt-bg-background nt-translate-y-0
         nt-shadow-[0_5px_15px_0_rgba(122,133,153,0.25)] nt-z-[9999]
       `,
            'popoverContent'
          )}
          style={{
            position: position.strategy,
            top: `${position.y ?? 0}px`,
            left: `${position.x ?? 0}px`,
          }}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
};

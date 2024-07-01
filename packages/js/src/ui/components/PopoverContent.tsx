import { createMemo, JSX, onCleanup, onMount, ParentComponent, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { getOffsetTranslate, getPositionClasses, useStyle } from '../helpers';
import { usePopover } from './Popover';

export const PopoverContent: ParentComponent = (props) => {
  const style = useStyle();
  const { setContentRef, opened, targetRef, position, offset, onClose, contentRef } = usePopover();

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

  const positionValue = createMemo(() => position || 'bottom-end');
  const positionClasses = createMemo(() => getPositionClasses(positionValue()));
  const offsetvalue = createMemo(() => getOffsetTranslate(offset, positionValue()));

  return (
    <Show when={opened() && targetRef()}>
      <Portal mount={targetRef() as HTMLElement}>
        <div
          id="novu-popover-content"
          ref={setContentRef}
          class={style(
            `nt-w-[400px] nt-h-[600px] nt-rounded-xl nt-bg-background nt-translate-y-0
         nt-shadow-[0_5px_15px_0_rgba(122,133,153,0.25)] nt-absolute nt-z-[9999]
       ${positionClasses()}`,
            'popover'
          )}
          style={offsetvalue()}
          data-position={positionValue()}
        >
          {props.children}
        </div>
      </Portal>
    </Show>
  );
};

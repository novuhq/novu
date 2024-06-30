import { ParentComponent, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { getOffsetTranslate, getPositionClasses, useStyle } from '../helpers';
import { usePopover } from './Popover';
import { clickOutside } from '../directives';

true && clickOutside;

export const PopoverContent: ParentComponent = (props) => {
  const style = useStyle();
  const { setContentRef, opened, targetRef, position, offset, onClose } = usePopover();

  const positionValue = position || 'bottom-end';
  const positionClasses = getPositionClasses(positionValue);
  const offsetvalue = getOffsetTranslate(offset, positionValue);

  return (
    <Show when={opened() && targetRef()}>
      <Portal mount={targetRef() as HTMLElement}>
        <div
          id="novu-popover-content"
          ref={setContentRef}
          class={style(
            `nt-w-[400px] nt-h-[600px] nt-rounded-xl nt-bg-background nt-translate-y-0
         nt-shadow-[0_5px_15px_0_rgba(122,133,153,0.25)] nt-absolute nt-z-[9999]
       ${positionClasses}`,
            'popover'
          )}
          style={offsetvalue}
          data-position={positionValue}
          use:clickOutside={() => onClose()}
        >
          {offsetvalue.transform}
          {props.children}
        </div>
      </Portal>
    </Show>
  );
};

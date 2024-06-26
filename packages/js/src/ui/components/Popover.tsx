import { Component, JSX, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useStyle } from '../helpers';

type PopoverProps = {
  isOpen: boolean;
  targetRef: HTMLDivElement | null;
  children?: JSX.Element;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  offset?: number;
};

export const Popover: Component<PopoverProps> = (props) => {
  const style = useStyle();

  const placementwithOffsetClass = placementwithOffset('right', props.offset || 0);

  return (
    <Show when={props.isOpen && props.targetRef !== null}>
      <Portal mount={props.targetRef as HTMLDivElement}>
        <div
          class={style(
            `nt-w-[400px] nt-h-[600px] nt-rounded-xl nt-bg-background
             nt-shadow-[0_5px_15px_0_rgba(122,133,153,0.25)] nt-absolute nt-z-[9999]
             ${placementwithOffsetClass}`,
            'popover'
          )}
        >
          <h1>Popup</h1>
          <p>Some text you might need for something or other.</p>
        </div>
        {props.children}
      </Portal>
    </Show>
  );
};

const placementwithOffset = (placement: 'top' | 'bottom' | 'left' | 'right', offset: number) => {
  switch (placement) {
    case 'top':
      return `nt-bottom-full nt-left-0 nt-right-0 nt-transform nt-translate-y-0 -nt-translate-x-1/2 nt-translate-y-[${offset}px]`;
    case 'bottom':
      return `nt-top-full nt-left-1/2 nt-transform nt-translate-y-0 -nt-translate-x-1/2 nt-translate-y-[${offset}px]`;
    case 'left':
      return `nt-right-full nt-top-1/2 nt-transform nt-translate-x-0 -nt-translate-y-1/2 nt-translate-x-[${offset}px]`;
    case 'right':
      return `nt-left-full nt-top-1/2 nt-transform nt-translate-x-0 -nt-translate-y-1/2 nt-translate-x-[${offset}px]`;
    default:
      return `nt-top-full nt-left-1/2 nt-transform nt-translate-y-0 -nt-translate-x-1/2 nt-translate-y-[${offset}px]`;
  }
};

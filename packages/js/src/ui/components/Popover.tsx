import { Component, JSX, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { useStyle } from '../helpers';

type Direction = 'top' | 'bottom' | 'left' | 'right';
type AnchorPosition = 'start' | 'end';

export type PopoverProps = {
  isOpen: boolean;
  targetRef: HTMLDivElement | null;
  children?: JSX.Element;
  placement?: Direction | `${Direction}-${AnchorPosition}`;
  offset?: number;
};

export const Popover: Component<PopoverProps> = (props) => {
  const style = useStyle();

  const placementwithOffsetClass = placementwithOffset(props.placement, props.offset || 0);

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

const placementwithOffset = (placement: PopoverProps['placement'], offset: number) => {
  switch (placement) {
    case 'top':
      return `nt-bottom-full nt-left-0 nt-right-0 nt-transform nt-translate-y-0 -nt-translate-x-1/2 nt-translate-y-[${offset}px]`;

    case 'top-start':
      return `nt-bottom-full nt-left-0 nt-right-0 nt-transform nt-translate-y-0 nt-translate-x-0 nt-translate-y-[${offset}px]`;

    case 'top-end':
      return `nt-bottom-full nt-left-0 nt-right-0 nt-transform nt-translate-y-0 -nt-translate-x-full nt-translate-y-[${offset}px]`;

    case 'bottom':
      return `nt-top-full nt-left-1/2 nt-transform nt-translate-y-0 -nt-translate-x-1/2 nt-translate-y-[${offset}px]`;

    case 'bottom-start':
      return `nt-top-full nt-left-1/2 nt-transform nt-translate-y-0 nt-translate-x-0 nt-translate-y-[${offset}px]`;

    case 'bottom-end':
      return `nt-top-full nt-left-1/2 nt-transform nt-translate-y-0 -nt-translate-x-full nt-translate-y-[${offset}px]`;

    case 'left':
      return `nt-right-full nt-top-1/2 nt-transform nt-translate-x-0 -nt-translate-y-1/2 nt-translate-x-[${offset}px]`;

    case 'left-start':
      return `nt-right-full nt-top-1/2 nt-transform nt-translate-x-0 nt-translate-y-0 nt-translate-x-[${offset}px]`;

    case 'left-end':
      return `nt-right-full nt-top-1/2 nt-transform nt-translate-x-0 -nt-translate-y-full nt-translate-x-[${offset}px]`;

    case 'right':
      return `nt-left-full nt-top-1/2 nt-transform nt-translate-x-0 -nt-translate-y-1/2 nt-translate-x-[${offset}px]`;

    case 'right-start':
      return `nt-left-full nt-top-1/2 nt-transform nt-translate-x-0 nt-translate-y-0 nt-translate-x-[${offset}px]`;

    case 'right-end':
      return `nt-left-full nt-top-1/2 nt-transform nt-translate-x-0 -nt-translate-y-full nt-translate-x-[${offset}px]`;

    default:
      return `nt-top-full nt-left-1/2 nt-transform nt-translate-y-0 -nt-translate-x-1/2 nt-translate-y-[${offset}px]`;
  }
};

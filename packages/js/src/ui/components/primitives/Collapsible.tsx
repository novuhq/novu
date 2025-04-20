import { type Component, JSX, createEffect, createSignal } from 'solid-js';
import { useStyle } from '../../helpers';

type CollapsibleProps = JSX.IntrinsicElements['div'] & {
  class?: string;
  open: boolean;
};

export const Collapsible: Component<CollapsibleProps> = (props) => {
  const style = useStyle();
  let contentRef: HTMLDivElement | undefined;
  const [enableTransition, setEnableTransition] = createSignal(false);

  createEffect(() => {
    // Delay applying transitions until after the initial render
    requestAnimationFrame(() => setEnableTransition(true));
  });

  return (
    <div
      ref={contentRef}
      class={style('collapsible', props.class)}
      style={{
        overflow: 'hidden',
        opacity: props.open ? 1 : 0,
        transition: enableTransition() ? 'height 250ms ease-in-out, opacity 250ms ease-in-out' : 'none',
        height: props.open ? `${contentRef?.scrollHeight}px` : '0px',
      }}
      {...props}
    />
  );
};

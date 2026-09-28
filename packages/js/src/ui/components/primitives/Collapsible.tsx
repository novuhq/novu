import { type Component, createEffect, createSignal, JSX, onCleanup } from 'solid-js';
import { useMotion, useStyle } from '../../helpers';

const TRANSITIONS = {
  full: 'height var(--nv-motion-duration-slow) var(--nv-motion-ease-standard), opacity var(--nv-motion-duration-slow) var(--nv-motion-ease-standard)',
  reduced: 'opacity var(--nv-motion-duration-fast) linear',
  off: 'none',
} as const;

type CollapsibleProps = JSX.IntrinsicElements['div'] & {
  class?: string;
  open: boolean;
};

const isInterpolateSizeSupported = () => {
  return CSS.supports('interpolate-size', 'allow-keywords');
};

export const Collapsible: Component<CollapsibleProps> = (props) => {
  const supportsInterpolateSize = isInterpolateSizeSupported();
  const style = useStyle();
  const motion = useMotion();
  let contentRef: HTMLDivElement | undefined;
  const [enableTransition, setEnableTransition] = createSignal(false);
  const [scrollHeight, setScrollHeight] = createSignal(0);

  const updateScrollHeight = () => {
    setScrollHeight(contentRef?.scrollHeight || 0);
  };

  createEffect(() => {
    // Delay applying transitions until after the initial render
    requestAnimationFrame(() => setEnableTransition(true));

    const resizeObserver = new ResizeObserver(() => {
      updateScrollHeight();
    });
    if (contentRef && !supportsInterpolateSize) {
      resizeObserver.observe(contentRef);
    }

    updateScrollHeight();

    onCleanup(() => {
      resizeObserver.disconnect();
    });
  });

  const height = () => {
    if (supportsInterpolateSize) {
      return props.open ? 'max-content' : '0px';
    }

    return props.open ? `${scrollHeight()}px` : '0px';
  };

  return (
    <div
      class={style({
        key: 'collapsible',
        className: props.class,
      })}
      style={{
        overflow: 'hidden',
        opacity: props.open ? 1 : 0,
        transition: enableTransition() ? TRANSITIONS[motion()] : 'none',
        height: height(),
      }}
      {...props}
    >
      <div ref={contentRef}>{props.children}</div>
    </div>
  );
};

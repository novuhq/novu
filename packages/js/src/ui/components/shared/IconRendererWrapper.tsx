import { onCleanup, onMount, Show, type JSX } from 'solid-js';
import { useAppearance } from '../../context';
import { cn, useStyle } from '../../helpers';
import type { IconKey, IconRenderer } from '../../types';

type IconRendererWrapperProps = {
  iconKey: IconKey;
  fallback: JSX.Element;
  class?: string;
};

export const IconRendererWrapper = (props: IconRendererWrapperProps) => {
  let el: HTMLDivElement | undefined;
  let cleanup: (() => void) | undefined;
  const appearance = useAppearance();
  const customRenderer = () => appearance.icons()?.[props.iconKey];

  onMount(() => {
    if (el && customRenderer()) {
      cleanup = (customRenderer() as IconRenderer)(el, { class: props.class });
    }
  });

  onCleanup(() => {
    cleanup?.();
  });

  return (
    <Show when={customRenderer()} fallback={props.fallback}>
      {/* Render the placeholder span. The user's renderer will populate it. */}
      <span ref={el} />
    </Show>
  );
};

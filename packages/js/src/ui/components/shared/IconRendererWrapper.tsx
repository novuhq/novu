import { onCleanup, onMount, Show, type JSX } from 'solid-js';
import { useAppearance } from '../../context';
import type { IconKey, IconRenderer } from '../../types';
import { useStyle } from '../../helpers';

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
      // Pass the element and props (including class) to the user's render function
      cleanup = (customRenderer() as IconRenderer)(el, { class: props.class });
    }
  });

  onCleanup(() => {
    cleanup?.();
  });

  return (
    <Show when={customRenderer()} fallback={props.fallback}>
      {/* Render the placeholder div. The user's renderer will populate it. */}
      <div ref={el} />
    </Show>
  );
};

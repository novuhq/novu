import { onCleanup, onMount } from 'solid-js';
import type { IconRenderer } from '../../types';

type IconRendererWrapperProps = {
  renderer: IconRenderer;
  class?: string;
};

export const IconRendererWrapper = (props: IconRendererWrapperProps) => {
  let el: HTMLDivElement | undefined;
  let cleanup: (() => void) | undefined;

  onMount(() => {
    if (el) {
      // Pass the element and props (including class) to the user's render function
      cleanup = props.renderer(el, { class: props.class });
    }
  });

  onCleanup(() => {
    cleanup?.();
  });

  /*
   * Render the placeholder div. The user's renderer will populate it.
   * Pass class to the placeholder div as well for potential wrapper styling.
   */
  return <div ref={el} />;
};

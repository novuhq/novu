import { type JSX, Show } from 'solid-js';
import { useAppearance } from '../../context';
import type { IconKey } from '../../types';
import { ExternalElementRenderer } from '../ExternalElementRenderer';

type IconRendererWrapperProps = {
  iconKey: IconKey;
  fallback: JSX.Element;
  class?: string;
};

export const IconRendererWrapper = (props: IconRendererWrapperProps) => {
  const appearance = useAppearance();
  const customRenderer = () => appearance.icons()?.[props.iconKey];

  return (
    <Show when={customRenderer()} fallback={props.fallback}>
      <ExternalElementRenderer render={(el) => customRenderer()!(el, { class: props.class })} />
    </Show>
  );
};

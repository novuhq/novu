import { type JSX, Show } from 'solid-js';
import { useAppearance } from '../../context';
import type { AllIconKey } from '../../types';
import { ExternalElementRenderer } from '../ExternalElementRenderer';

type IconRendererWrapperProps = {
  iconKey: AllIconKey;
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

type IconRendererProps = {
  iconKey: AllIconKey;
  class?: string;
  fallback: (props?: JSX.HTMLAttributes<SVGSVGElement>) => JSX.Element;
};

export const IconRenderer = (props: IconRendererProps) => {
  return (
    <IconRendererWrapper
      iconKey={props.iconKey}
      class={props.class}
      fallback={<props.fallback class={props.class} />}
    />
  );
};

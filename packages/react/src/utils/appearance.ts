import type { AllAppearance, AllIconKey, AllIconOverrides } from '@novu/js/ui';
import { MountedElement } from '../context/RendererContext';
import type { ReactIconRenderer, ReactInboxAppearance, ReactSubscriptionAppearance } from './types';

export function adaptAppearanceForJs(
  appearance: ReactInboxAppearance | ReactSubscriptionAppearance,
  mountElement: (el: HTMLElement, mountedElement: MountedElement) => () => void
): AllAppearance | undefined {
  if (!appearance) {
    return undefined;
  }
  const { icons, ...restAppearance } = appearance;
  const jsAppearance = { ...restAppearance } as AllAppearance;

  if (icons) {
    const jsIcons: AllIconOverrides = {};
    const iconKeys = Object.keys(icons) as Array<AllIconKey>;

    for (const iconKey of iconKeys) {
      // @ts-expect-error: cant easily fix this type error
      const reactRenderer = icons[iconKey] as ReactIconRenderer;

      if (reactRenderer) {
        jsIcons[iconKey] = (el: HTMLDivElement, props: { class?: string }) => {
          return mountElement(el, reactRenderer(props));
        };
      }
    }

    // JsAppearance also has .icons directly (from JsTheme part of JsAppearance)
    jsAppearance.icons = jsIcons;
  } else {
    // If original didn't have icons, ensure the clone doesn't either
    delete jsAppearance.icons;
  }

  return jsAppearance;
}

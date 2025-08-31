import type { IconKey, Appearance as JsAppearance, IconOverrides as JsIconOverrides } from '@novu/js/ui';
import { MountedElement } from '../context/RendererContext';
import type { ReactAppearance } from './types';

export function adaptAppearanceForJs(
  appearance: ReactAppearance,
  mountElement: (el: HTMLElement, mountedElement: MountedElement) => () => void
): JsAppearance | undefined {
  if (!appearance) {
    return undefined;
  }
  const { icons, ...restAppearance } = appearance;
  const jsAppearance: JsAppearance = { ...restAppearance };

  if (icons) {
    const jsIcons: JsIconOverrides = {};
    const iconKeys = Object.keys(icons) as IconKey[];

    for (const iconKey of iconKeys) {
      const reactRenderer = icons[iconKey];

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

import type { IconKey, IconRenderer, Appearance as JsAppearance, IconOverrides as JsIconOverrides } from '@novu/js/ui';
import { MountedElement } from '../context/RendererContext';
import type { ReactAppearance, ReactIconRenderer } from './types';

export function adaptAppearanceForJs(
  appearance: ReactAppearance,
  mountElement: (el: HTMLElement, mountedElement: MountedElement) => () => void
): JsAppearance | undefined {
  if (!appearance) {
    return undefined;
  }

  const jsAppearance: JsAppearance = JSON.parse(JSON.stringify(appearance));

  if (appearance.icons) {
    const jsIcons: JsIconOverrides = {};
    const reactIcons = appearance.icons;
    const iconKeys = Object.keys(reactIcons) as IconKey[];

    for (const iconKey of iconKeys) {
      const reactRenderer = reactIcons[iconKey];

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

import { createRoot } from 'react-dom/client';
// Try importing ONLY Appearance first to isolate the issue
import type {
  Appearance as JsAppearance,
  IconRenderer,
  IconOverrides as JsIconOverrides,
  IconKey,
  Theme as JsTheme,
  Variables,
} from '@novu/js/ui';
// Temporarily comment out other imports from @novu/js/ui
/*
 *import type {
 *  IconRenderer,
 *  IconOverrides as JsIconOverrides,
 *  IconKey,
 *  Theme as JsTheme,
 *  Variables,
 *} from '@novu/js/ui';
 */
import type { ReactAppearance, ReactIconRenderer } from './types';

// Helper to check if a value is an object (and not null)
function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/*
 * Temporarily use 'any' for types that were previously imported,
 * just to see if the JsAppearance type resolves and allows .theme access.
 */
/*
 * type IconRenderer = any;
 * type JsIconOverrides = any;
 * type IconKey = any;
 */

function adaptIconRenderer(reactRenderer: ReactIconRenderer): IconRenderer {
  return (el: HTMLDivElement, props: { class?: string }) => {
    // Keep explicit types here
    const root = createRoot(el);
    root.render(reactRenderer(props ?? {}));

    return () => {
      setTimeout(() => root.unmount(), 0);
    };
  };
}

export function adaptAppearanceForJs(
  appearance?: ReactAppearance // Input is ReactAppearance
): JsAppearance | undefined {
  // Output is JsAppearance
  if (!appearance) {
    return undefined;
  }

  // Deep clone. JsAppearance should have a compatible structure now.
  const jsAppearance: JsAppearance = JSON.parse(JSON.stringify(appearance));

  // ReactAppearance has .icons directly (from ReactTheme)
  if (appearance.icons) {
    const jsIcons: JsIconOverrides = {};
    const reactIcons = appearance.icons; // Access .icons directly
    const iconKeys = Object.keys(reactIcons) as IconKey[];

    for (const iconKey of iconKeys) {
      const reactRenderer = reactIcons[iconKey];
      if (reactRenderer) {
        jsIcons[iconKey] = adaptIconRenderer(reactRenderer);
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

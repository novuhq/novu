import { Accessor, createEffect, createSignal, onCleanup, untrack } from 'solid-js';
import { NOVU_DEFAULT_CSS_ID } from './css';

type StylesRoot = Node | null | undefined;

const rootDocument = (container: StylesRoot) => (container instanceof ShadowRoot ? container : document);

/**
 * Inserts the bundled default stylesheet once per document or shadow root, as the first style so appearance
 * rules can override it. Idempotent across engine instances sharing a root.
 */
export const injectDefaultCss = ({ css, container }: { css: string; container: Accessor<StylesRoot> }) => {
  const stylesContainer = untrack(container);
  const root = rootDocument(stylesContainer);
  if (root.getElementById(NOVU_DEFAULT_CSS_ID)) {
    return;
  }

  const styleEl = document.createElement('style');
  styleEl.id = NOVU_DEFAULT_CSS_ID;
  styleEl.innerHTML = css;

  const parent = stylesContainer ?? document.head;
  parent.insertBefore(styleEl, parent.firstChild);

  onCleanup(() => {
    styleEl.remove();
  });
};

/**
 * Owns the per-instance `<style>` element that carries the resolved appearance variables and css-in-js rules,
 * placed right after the default stylesheet.
 */
export const createAppearanceStylesheet = ({
  id,
  container,
  rules,
}: {
  id: string;
  container: Accessor<StylesRoot>;
  rules: Accessor<string[]>;
}) => {
  const [styleElement, setStyleElement] = createSignal<HTMLStyleElement | null>(null);

  const stylesContainer = untrack(container);
  const root = rootDocument(stylesContainer);
  const existing = root.getElementById(id);
  if (existing) {
    setStyleElement(existing as HTMLStyleElement);
  } else {
    const parent = stylesContainer ?? document.head;
    const styleEl = document.createElement('style');
    styleEl.id = id;

    const defaultCssStyles = root.getElementById(NOVU_DEFAULT_CSS_ID);
    if (defaultCssStyles) {
      parent.insertBefore(styleEl, defaultCssStyles.nextSibling);
    } else {
      parent.appendChild(styleEl);
    }

    setStyleElement(styleEl);

    onCleanup(() => {
      styleEl.remove();
    });
  }

  createEffect(() => {
    const styleEl = styleElement();
    if (!styleEl) {
      return;
    }

    styleEl.innerHTML = rules().join(' ');
  });
};

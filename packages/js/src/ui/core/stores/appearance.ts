import { Accessor, createMemo } from 'solid-js';
import { defaultVariables } from '../../config/defaultVariables';
import type { AllAppearance, AllElements, AllIconOverrides, Variables } from '../../types';
import { parseElements, parseVariables } from '../style/css';
import { createAppearanceStylesheet, injectDefaultCss } from '../style/inject';

export type AppearanceStore = {
  id: Accessor<string>;
  container: Accessor<Node | null | undefined>;
  variables: Accessor<Variables>;
  elements: Accessor<AllElements>;
  animations: Accessor<boolean>;
  icons: Accessor<AllIconOverrides>;
  /** Appearance key to the generated class carrying that key's css-in-js styles. */
  appearanceKeyToCssInJsClass: Accessor<Record<string, string>>;
};

const EMPTY_VARIABLES: Variables = {};
const EMPTY_ICONS: AllIconOverrides = {};

/**
 * Resolves the host's appearance (base themes, variables, element styles, icons) into what renderers read, and
 * keeps the instance stylesheet in sync. Every accessor returns a stable reference until its input changes.
 */
export const createAppearanceStore = ({
  id,
  appearance,
  container,
  defaultCss,
}: {
  id: string;
  appearance: Accessor<AllAppearance | undefined>;
  container: Accessor<Node | null | undefined>;
  defaultCss?: string;
}): AppearanceStore => {
  const themes = createMemo(() => {
    const baseTheme = appearance()?.baseTheme;

    return Array.isArray(baseTheme) ? baseTheme : [baseTheme || {}];
  });

  const variables = createMemo(() => appearance()?.variables ?? EMPTY_VARIABLES);
  const animations = createMemo(() => appearance()?.animations ?? true);
  const icons = createMemo(() => appearance()?.icons ?? EMPTY_ICONS);
  const elements = createMemo(() => {
    const baseElements = themes().reduce<AllElements>((acc, obj) => ({ ...acc, ...(obj.elements || {}) }), {});

    return { ...baseElements, ...(appearance()?.elements || {}) };
  });

  const variableRules = createMemo(() => {
    const baseVariables = {
      ...defaultVariables,
      ...themes().reduce<Variables>((acc, obj) => ({ ...acc, ...(obj.variables || {}) }), {}),
    };

    return parseVariables({ ...baseVariables, ...variables() }, id);
  });

  const elementsStyleData = createMemo(() => parseElements(elements()));
  const elementRules = createMemo(() => elementsStyleData().map((el) => el.rule));
  const appearanceKeyToCssInJsClass = createMemo(() =>
    elementsStyleData().reduce<Record<string, string>>((acc, item) => {
      acc[item.key] = item.className;

      return acc;
    }, {})
  );

  if (defaultCss !== undefined) {
    injectDefaultCss({ css: defaultCss, container });
  }
  createAppearanceStylesheet({ id, container, rules: () => [...variableRules(), ...elementRules()] });

  return {
    id: () => id,
    container,
    variables,
    elements,
    animations,
    icons,
    appearanceKeyToCssInJsClass,
  };
};

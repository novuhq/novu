import { ParentProps, createContext, createEffect, createSignal, onMount, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { NOVU_CSS_IN_JS_STYLESHEET_ID, defaultVariables } from '../config';
import { parseElements, parseVariables } from '../helpers';

export type CSSProperties = {
  [key: string]: string | number;
};

export type ElementStyles = string | CSSProperties;

export type Elements = {
  button?: ElementStyles;
  root?: ElementStyles;
};

export type Variables = {
  colorBackground?: string;
  colorForeground?: string;
  colorPrimary?: string;
  colorPrimaryForeground?: string;
  colorSecondary?: string;
  colorSecondaryForeground?: string;
  colorNeutral?: string;
  fontSize?: string;
  borderRadius?: string;
};

export type AppearanceContextType = {
  variables?: Variables;
  elements?: Elements;
  descriptorToCssInJsClass: Record<string, string>;
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

type AppearanceProviderProps = ParentProps & Pick<AppearanceContextType, 'elements' | 'variables'>;

export const AppearanceProvider = (props: AppearanceProviderProps) => {
  const [store, setStore] = createStore<{
    descriptorToCssInJsClass: Record<string, string>;
  }>({ descriptorToCssInJsClass: {} });
  const [styleElement, setStyleElement] = createSignal<HTMLStyleElement | null>(null);
  const [rules, setRules] = createSignal<string[]>([]);

  //place style element on HEAD. Placing in body is available for HTML 5.2 onward.
  onMount(() => {
    const styleEl = document.createElement('style');
    styleEl.id = NOVU_CSS_IN_JS_STYLESHEET_ID;
    document.head.appendChild(styleEl);

    setStyleElement(styleEl);
  });

  //handle variables
  createEffect(() => {
    const styleEl = styleElement();

    if (!styleEl) {
      return;
    }

    const variableRules = parseVariables({ ...defaultVariables, ...(props.variables || ({} as Variables)) });
    setRules((oldRules) => [...oldRules, ...variableRules]);
  });

  //handle elements
  createEffect(() => {
    const styleEl = styleElement();

    if (!styleEl) {
      return;
    }

    const elementsStyleData = parseElements(props.elements || {});
    setStore('descriptorToCssInJsClass', (obj) => ({
      ...obj,
      ...elementsStyleData.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = item.className;

        return acc;
      }, {}),
    }));
    setRules((oldRules) => [...oldRules, ...elementsStyleData.map((el) => el.rule)]);
  });

  //add rules to style element
  createEffect(() => {
    const styleEl = styleElement();
    if (!styleEl) {
      return;
    }

    styleEl.innerHTML = rules().join(' ');
  });

  return (
    <AppearanceContext.Provider
      value={{
        elements: props.elements || {},
        descriptorToCssInJsClass: store.descriptorToCssInJsClass,
      }}
    >
      {props.children}
    </AppearanceContext.Provider>
  );
};

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }

  return context;
}

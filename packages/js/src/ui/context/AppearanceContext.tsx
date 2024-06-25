import { ParentProps, createContext, createEffect, createSignal, onCleanup, onMount, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { defaultVariables } from '../config';
import { parseElements, parseVariables } from '../helpers';

export type CSSProperties = {
  [key: string]: string | number;
};

export type ElementStyles = string | CSSProperties;

export type Elements = {
  button?: ElementStyles;
  root?: ElementStyles;
  bell?: ElementStyles;
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

type AppearanceContextType = {
  variables?: Variables;
  elements?: Elements;
  descriptorToCssInJsClass: Record<string, string>;
  id: string;
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export type Appearance = Pick<AppearanceContextType, 'elements' | 'variables'>;

type AppearanceProviderProps = ParentProps & Appearance & { id: string };

export const AppearanceProvider = (props: AppearanceProviderProps) => {
  const [store, setStore] = createStore<{
    descriptorToCssInJsClass: Record<string, string>;
  }>({ descriptorToCssInJsClass: {} });
  const [styleElement, setStyleElement] = createSignal<HTMLStyleElement | null>(null);
  const [elementRules, setElementRules] = createSignal<string[]>([]);
  const [variableRules, setVariableRules] = createSignal<string[]>([]);

  //place style element on HEAD. Placing in body is available for HTML 5.2 onward.
  onMount(() => {
    const el = document.getElementById(props.id);
    if (el) {
      setStyleElement(el as HTMLStyleElement);

      return;
    }

    const styleEl = document.createElement('style');
    styleEl.id = props.id;
    document.head.appendChild(styleEl);

    setStyleElement(styleEl);
  });

  onCleanup(() => {
    const el = document.getElementById(props.id);
    if (el) {
      el.remove();
    }
  });

  //handle variables
  createEffect(() => {
    const styleEl = styleElement();

    if (!styleEl) {
      return;
    }

    setVariableRules(parseVariables({ ...defaultVariables, ...(props.variables || ({} as Variables)) }, props.id));
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
    setElementRules(elementsStyleData.map((el) => el.rule));
  });

  //add rules to style element
  createEffect(() => {
    const styleEl = styleElement();
    if (!styleEl) {
      return;
    }

    styleEl.innerHTML = [...variableRules(), ...elementRules()].join(' ');
  });

  return (
    <AppearanceContext.Provider
      value={{
        elements: props.elements || {},
        descriptorToCssInJsClass: store.descriptorToCssInJsClass,
        id: props.id,
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

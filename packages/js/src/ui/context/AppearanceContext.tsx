import {
  Accessor,
  createContext,
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  ParentProps,
  useContext,
} from 'solid-js';
import { createStore } from 'solid-js/store';
import { defaultVariables } from '../config';
import { parseElements, parseVariables } from '../helpers';
import type { Appearance, Elements, Variables } from '../types';

type AppearanceContextType = {
  variables: Accessor<Variables>;
  elements: Accessor<Elements>;
  animations: Accessor<boolean>;
  appearanceKeyToCssInJsClass: Record<string, string>;
  id: Accessor<string>;
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

type AppearanceProviderProps = ParentProps & { appearance?: Appearance } & { id: string };

export const AppearanceProvider = (props: AppearanceProviderProps) => {
  const [store, setStore] = createStore<{
    appearanceKeyToCssInJsClass: Record<string, string>;
  }>({ appearanceKeyToCssInJsClass: {} });
  const [styleElement, setStyleElement] = createSignal<HTMLStyleElement | null>(null);
  const [elementRules, setElementRules] = createSignal<string[]>([]);
  const [variableRules, setVariableRules] = createSignal<string[]>([]);
  const themes = createMemo(() =>
    Array.isArray(props.appearance?.baseTheme) ? props.appearance?.baseTheme || [] : [props.appearance?.baseTheme || {}]
  );

  const id = () => props.id;
  const variables = () => props.appearance?.variables || {};
  const animations = () => props.appearance?.animations ?? true;
  const allElements = createMemo(() => {
    const baseElements = themes().reduce<Elements>((acc, obj) => ({ ...acc, ...(obj.elements || {}) }), {});

    return { ...baseElements, ...(props.appearance?.elements || {}) };
  });

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

    onCleanup(() => {
      const element = document.getElementById(props.id);
      if (element) {
        element.remove();
      }
    });
  });

  // handle variables
  createEffect(() => {
    const styleEl = styleElement();

    if (!styleEl) {
      return;
    }

    const baseVariables = {
      ...defaultVariables,
      ...themes().reduce<Variables>((acc, obj) => ({ ...acc, ...(obj.variables || {}) }), {}),
    };

    setVariableRules(
      parseVariables({ ...baseVariables, ...(props.appearance?.variables || ({} as Variables)) }, props.id)
    );
  });

  // handle elements
  createEffect(() => {
    const styleEl = styleElement();

    if (!styleEl) {
      return;
    }

    const elementsStyleData = parseElements(allElements());
    setStore('appearanceKeyToCssInJsClass', (obj) => ({
      ...obj,
      ...elementsStyleData.reduce<Record<string, string>>((acc, item) => {
        acc[item.key] = item.className;

        return acc;
      }, {}),
    }));
    setElementRules(elementsStyleData.map((el) => el.rule));
  });

  // add rules to style element
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
        elements: allElements,
        variables,
        appearanceKeyToCssInJsClass: store.appearanceKeyToCssInJsClass, // stores are reactive
        animations,
        id,
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

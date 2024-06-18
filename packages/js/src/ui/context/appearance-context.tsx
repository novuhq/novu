import { ParentProps, createContext, createEffect, createSignal, onMount, useContext } from 'solid-js';
import { createStore } from 'solid-js/store';
import { NOVU_CSS_IN_JS_STYLESHEET_ID } from '../config';
import { createClassFromCssString, cssObjectToString } from '../helpers';
import type {
  AppearanceContextType,
  Variables,
  CSSProperties,
  ElementStyles,
  Elements,
} from './appearance-context.types';

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

type AppearanceProviderProps = ParentProps & Pick<AppearanceContextType, 'elements' | 'variables'>;

export const AppearanceProvider = (props: AppearanceProviderProps) => {
  const [store, setStore] = createStore<{
    descriptorToCssInJsClass: Record<string, string>;
  }>({ descriptorToCssInJsClass: {} });
  const [styleElement, setStyleElement] = createSignal<HTMLStyleElement | null>(null);

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

    //handle color variables
    for (const key in props.variables?.colors) {
      const colors = props.variables?.colors;

      if (colors && colors.hasOwnProperty(key)) {
        const value = colors[key as keyof Variables['colors']];

        const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
        const cssVariableRule = `:root { --novu-colors-${key}: oklch(from ${value} l c h); }`;
        styleEl.sheet?.insertRule(cssVariableRule, styleEl.sheet.cssRules.length);
        //alpha shades
        for (let i = 0; i < shades.length; i++) {
          const shade = shades[i];
          const cssVariableAlphaRule = `:root { --novu-colors-${key}-alpha-${shade}: oklch(from ${value} l c h / ${
            shade / 1000
          }); }`;
          styleEl.sheet?.insertRule(cssVariableAlphaRule, styleEl.sheet.cssRules.length);
        }
        //solid shades
        for (let i = 0; i < shades.length; i++) {
          const shade = shades[i];
          const cssVariableSolidRule = `:root { --novu-colors-${key}-${shade}: oklch(from ${value} calc(l - ${
            (shade - 500) / 1000
          }) c h); }`;
          styleEl.sheet?.insertRule(cssVariableSolidRule, styleEl.sheet.cssRules.length);
        }
      }
    }
  });

  //handle elements
  createEffect(() => {
    const styleEl = styleElement();

    if (!styleEl) {
      return;
    }

    for (const key in props.elements) {
      const elements = props.elements;
      if (elements.hasOwnProperty(key)) {
        const value = elements[key as keyof Elements];
        if (typeof value === 'object') {
          // means it is css in js object
          const cssString = cssObjectToString(value);
          const classname = createClassFromCssString(styleEl, cssString);
          setStore('descriptorToCssInJsClass', (obj) => ({
            ...obj,
            [key]: classname,
          }));
        }
      }
    }
  });

  return (
    <>
      <AppearanceContext.Provider
        value={{
          elements: props.elements || {},
          descriptorToCssInJsClass: store.descriptorToCssInJsClass,
        }}
      >
        {props.children}
      </AppearanceContext.Provider>
    </>
  );
};

export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (!context) {
    throw new Error('useAppearance must be used within an AppearanceProvider');
  }

  return context;
}

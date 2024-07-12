import {
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

export type CSSProperties = {
  [key: string]: string | number;
};

export type ElementStyles = string | CSSProperties;

/*
 * The double underscore signals that entire key extends the right part of the key
 * i.e. foo__bar means that foo_bar is an extension of bar. Both keys will be applied when foo_bar is used
 * meaning you would have `bar foo__bar` in the dom
 */
export const appearanceKeys = [
  //Primitives
  'button',
  'popoverContent',
  'popoverTrigger',
  'dropdownContent',
  'dropdownTrigger',
  'dropdownItem',
  'dropdownItemLabel',
  'dropdownItemLabelContainer',
  'dropdownItemLeftIcon',
  'dropdownItemRightIcon',

  //General
  'root',
  'bellIcon',
  'bellContainer',
  'settings__button',
  'inboxHeader',

  //Inbox
  'inbox__popoverTrigger',
  'inbox__popoverContent',

  //Inbox status
  'inboxStatus__title',
  'inboxStatus__dropdownTrigger',
  'inboxStatus__dropdownContent',
  'inboxStatus__dropdownItem',
  'inboxStatus__dropdownItemLabel',
  'inboxStatus__dropdownItemLabelContainer',
  'inboxStatus__dropdownItemLeftIcon',
  'inboxStatus__dropdownItemRightIcon',

  //More actions
  'moreActionsContainer',
  'moreActions__dropdownTrigger',
  'moreActions__dropdownContent',
  'moreActions__dropdownItem',
  'moreActions__dropdownItemLabel',
  'moreActions__dropdownItemLabelContainer',
  'moreActions__dropdownItemLeftIcon',
] as const;

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

export type AppearanceKey = (typeof appearanceKeys)[number];
export type Elements = Partial<Record<AppearanceKey, ElementStyles>>;

type AppearanceContextType = {
  variables?: Variables;
  elements?: Elements;
  appearanceKeyToCssInJsClass: Record<string, string>;
  id: string;
};

const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

export type Theme = Pick<AppearanceContextType, 'elements' | 'variables'>;
export type Appearance = Theme & { baseTheme?: Theme | Theme[] };

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

  //handle variables
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

  //handle elements
  createEffect(() => {
    const styleEl = styleElement();

    if (!styleEl) {
      return;
    }

    const baseElements = themes().reduce<Elements>((acc, obj) => ({ ...acc, ...(obj.elements || {}) }), {});

    const elementsStyleData = parseElements({ ...baseElements, ...(props.appearance?.elements || {}) });
    setStore('appearanceKeyToCssInJsClass', (obj) => ({
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
        elements: props.appearance?.elements || {},
        appearanceKeyToCssInJsClass: store.appearanceKeyToCssInJsClass,
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

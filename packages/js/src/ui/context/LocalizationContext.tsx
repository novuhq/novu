import { Accessor, createContext, createMemo, ParentProps, useContext } from 'solid-js';
import { defaultLocalization, dynamicLocalization } from '../config/defaultLocalization';

export type LocalizationKey = keyof typeof defaultLocalization;

export type StringLocalizationKey = {
  [K in LocalizationKey]: (typeof defaultLocalization)[K] extends string ? K : never;
}[LocalizationKey];

export type Localization = {
  [K in LocalizationKey]?: (typeof defaultLocalization)[K] extends (...args: infer P) => any
    ? ((...args: P) => ReturnType<(typeof defaultLocalization)[K]>) | string
    : string;
} & {
  dynamic?: Record<string, string>;
};

export type TranslateFunctionArg<K extends LocalizationKey> = K extends keyof typeof defaultLocalization
  ? (typeof defaultLocalization)[K] extends (arg: infer A) => any
    ? A
    : undefined
  : undefined;

export type TranslateFunction = <K extends LocalizationKey>(
  key: K,
  ...args: TranslateFunctionArg<K> extends undefined
    ? [undefined?] // No arguments needed if TranslateFunctionArg<K> is undefined
    : [TranslateFunctionArg<K>] // A single argument is required if TranslateFunctionArg<K> is defined
) => string;

type LocalizationContextType = {
  t: TranslateFunction;
  locale: Accessor<string>;
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

type LocalizationProviderProps = ParentProps & { localization?: Localization };

export const LocalizationProvider = (props: LocalizationProviderProps) => {
  const localization = createMemo<Record<string, string | Function>>(() => {
    const { dynamic, ...localizationObject } = props.localization || {};

    return {
      ...defaultLocalization,
      ...dynamicLocalization(),
      ...(dynamic || {}),
      ...localizationObject,
    };
  });

  const t: LocalizationContextType['t'] = (key, ...args) => {
    const value = localization()[key];
    if (typeof value === 'function') {
      return value(args[0]);
    }

    return value as string;
  };

  const locale = createMemo(() => localization().locale as string);

  return (
    <LocalizationContext.Provider
      value={{
        t,
        locale,
      }}
    >
      {props.children}
    </LocalizationContext.Provider>
  );
};

export function useLocalization() {
  const context = useContext(LocalizationContext);
  if (!context) {
    throw new Error('useLocalization must be used within an LocalizationProvider');
  }

  return context;
}

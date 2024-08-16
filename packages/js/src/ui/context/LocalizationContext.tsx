import { Accessor, createContext, createMemo, ParentProps, useContext } from 'solid-js';
import { defaultLocalization } from '../config/defaultLocalization';
import type { Localization, LocalizationKey } from '../types';

type LocalizationValue<K extends LocalizationKey> = (typeof defaultLocalization)[K];
type LocalizationParams<K extends LocalizationKey> = LocalizationValue<K> extends (args: infer P) => any
  ? P
  : undefined;

type LocalizationContextType = {
  t: <K extends LocalizationKey>(
    key: K,
    ...args: LocalizationParams<K> extends undefined ? [] : [LocalizationParams<K>]
  ) => string;
  locale: Accessor<string>;
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

type LocalizationProviderProps = ParentProps & { localization?: Localization };

export const LocalizationProvider = (props: LocalizationProviderProps) => {
  const localization = createMemo(() => ({ ...defaultLocalization, ...(props.localization || {}) }));

  const t: LocalizationContextType['t'] = (key, ...args) => {
    const value = localization()[key];
    if (typeof value === 'function') {
      return (value as (args: LocalizationParams<typeof key>) => string)(args[0]!);
    }

    return value as string;
  };

  const locale = createMemo(() => localization().locale);

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

import { createContext, createMemo, ParentProps, useContext } from 'solid-js';
import { defaultLocalization } from '../config/defaultLocalization';
import { Path } from '../helpers/types';

export type Localization = Partial<Record<keyof typeof defaultLocalization, string>>;
export type LocalizationKey = keyof typeof defaultLocalization;

type LocalizationPath = Path<Localization>;

type LocalizationContextType = {
  t: (key: LocalizationPath) => string;
  locale: string;
};

const LocalizationContext = createContext<LocalizationContextType | undefined>(undefined);

type LocalizationProviderProps = ParentProps & { localization?: Localization };

export const LocalizationProvider = (props: LocalizationProviderProps) => {
  const localization = createMemo(() => ({ ...defaultLocalization, ...(props.localization || {}) }));

  const t = (key: LocalizationPath) => {
    const value = localization()[key];

    return value;
  };

  return (
    <LocalizationContext.Provider
      value={{
        t,
        locale: localization().locale,
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

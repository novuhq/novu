import { ParentProps, createContext, createMemo, useContext } from 'solid-js';
import { defaultLocalization } from '../config/default-localization';
import { Path } from '../helpers/types';

export type Localization = {
  'inbox.title': string;
};

type LocalizationPath = Path<Localization>;

type LocalizationContextType = {
  t: (key: LocalizationPath) => string;
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

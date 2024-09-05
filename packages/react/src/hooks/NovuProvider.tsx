import { Novu, NovuOptions } from '@novu/js';
import { createContext, useContext, useMemo } from 'react';

type NovuProviderProps = NovuOptions & {
  children: JSX.Element;
};

const NovuContext = createContext<Novu | undefined>(undefined);

export const NovuProvider = (props: NovuProviderProps) => {
  const { children, ...options } = props;
  const novu = useMemo(() => new Novu(options), []);

  return <NovuContext.Provider value={novu}>{children}</NovuContext.Provider>;
};

export const useNovu = () => {
  const context = useContext(NovuContext);
  if (!context) {
    throw new Error('useNovu must be used within a <NovuProvider />');
  }

  return context;
};

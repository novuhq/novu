import { createContext, createMemo, JSX, useContext } from 'solid-js';
import { Novu } from '../../novu';
import type { NovuOptions } from '../../types';

type NovuProviderProps = {
  options: NovuOptions;
  children: JSX.Element;
  novu?: Novu;
};

const NovuContext = createContext<Novu | undefined>(undefined);

export function NovuProvider(props: NovuProviderProps) {
  const novu = createMemo(() => props.novu || new Novu(props.options));

  return <NovuContext.Provider value={novu()}>{props.children}</NovuContext.Provider>;
}

export function useNovu() {
  const context = useContext(NovuContext);
  if (!context) {
    throw new Error('useNovu must be used within a NovuProvider');
  }

  return context;
}

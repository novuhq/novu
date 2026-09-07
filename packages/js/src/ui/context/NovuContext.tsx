import { Accessor, createContext, createMemo, JSX, useContext } from 'solid-js';
import { Novu } from '../../novu';
import type { NovuOptions } from '../../types';

type NovuProviderProps = {
  options: NovuOptions;
  children: JSX.Element;
  novu?: Novu | Accessor<Novu | undefined>;
};

const NovuContext = createContext<Accessor<Novu> | undefined>(undefined);

export function NovuProvider(props: NovuProviderProps) {
  const novu = createMemo(() => {
    const novuValue = typeof props.novu === 'function' ? props.novu() : props.novu;

    return novuValue || new Novu(props.options);
  });

  return <NovuContext.Provider value={novu}>{props.children}</NovuContext.Provider>;
}

export function useNovu(): Accessor<Novu> {
  const context = useContext(NovuContext);
  if (!context) {
    throw new Error('useNovu must be used within a NovuProvider');
  }

  return context;
}

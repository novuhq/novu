import { Accessor, createContext, JSX, useContext } from 'solid-js';
import { Novu } from '../../novu';

type NovuProviderProps = {
  novu: Accessor<Novu>;
  children: JSX.Element;
};

const NovuContext = createContext<Accessor<Novu> | undefined>(undefined);

export function NovuProvider(props: NovuProviderProps) {
  return <NovuContext.Provider value={props.novu}>{props.children}</NovuContext.Provider>;
}

export function useNovu(): Accessor<Novu> {
  const context = useContext(NovuContext);
  if (!context) {
    throw new Error('useNovu must be used within a NovuProvider');
  }

  return context;
}

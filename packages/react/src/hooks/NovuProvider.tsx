import { Novu, NovuOptions } from '@novu/js';
import { ReactNode, createContext, useContext, useMemo } from 'react';

type NovuProviderProps = NovuOptions & {
  children: ReactNode;
};

const NovuContext = createContext<Novu | undefined>(undefined);

export const NovuProvider = ({
  children,
  applicationIdentifier,
  subscriberId,
  subscriberHash,
  backendUrl,
  socketUrl,
  useCache,
}: NovuProviderProps) => {
  const novu = useMemo(
    () => new Novu({ applicationIdentifier, subscriberId, subscriberHash, backendUrl, socketUrl, useCache }),
    [applicationIdentifier, subscriberId, subscriberHash, backendUrl, socketUrl, useCache]
  );

  return <NovuContext.Provider value={novu}>{children}</NovuContext.Provider>;
};

export const useNovu = () => {
  const context = useContext(NovuContext);
  if (!context) {
    throw new Error('useNovu must be used within a <NovuProvider />');
  }

  return context;
};

export const useUnsafeNovu = () => {
  const context = useContext(NovuContext);

  return context;
};

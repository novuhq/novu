import { Novu, NovuOptions } from '@novu/js';
import { ReactNode, createContext, useContext, useMemo } from 'react';

// @ts-ignore
const version = PACKAGE_VERSION;
// @ts-ignore
const name = PACKAGE_NAME;
const baseUserAgent = `${name}@${version}`;

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
  return (
    <InternalNovuProvider
      applicationIdentifier={applicationIdentifier}
      subscriberId={subscriberId}
      subscriberHash={subscriberHash}
      backendUrl={backendUrl}
      socketUrl={socketUrl}
      useCache={useCache}
      userAgentType="hooks"
    >
      {children}
    </InternalNovuProvider>
  );
};

/**
 * @internal Should be used internally not to be exposed outside of the library
 * This is needed to differentiate between the hooks and components user agents
 * Better to use this internally to avoid confusion.
 */
export const InternalNovuProvider = ({
  children,
  applicationIdentifier,
  subscriberId,
  subscriberHash,
  backendUrl,
  socketUrl,
  useCache,
  userAgentType,
}: NovuProviderProps & { userAgentType: 'components' | 'hooks' }) => {
  const novu = useMemo(
    () =>
      new Novu({
        applicationIdentifier,
        subscriberId,
        subscriberHash,
        backendUrl,
        socketUrl,
        useCache,
        __userAgent: `${baseUserAgent} ${userAgentType}`,
      }),
    [applicationIdentifier, subscriberId, subscriberHash, backendUrl, socketUrl, useCache, userAgentType]
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

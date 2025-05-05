import { Novu, NovuOptions, Subscriber } from '@novu/js';
import { ReactNode, createContext, useContext, useMemo } from 'react';

// @ts-ignore
const version = PACKAGE_VERSION;
// @ts-ignore
const name = PACKAGE_NAME;
const baseUserAgent = `${name}@${version}`;

export type NovuProviderProps = NovuOptions & {
  children: ReactNode;
};

const NovuContext = createContext<Novu | undefined>(undefined);

export const NovuProvider = ({
  children,
  applicationIdentifier,
  subscriberId,
  subscriberHash,
  backendUrl,
  apiUrl,
  socketUrl,
  useCache,
  subscriber,
}: NovuProviderProps) => {
  return (
    <InternalNovuProvider
      applicationIdentifier={applicationIdentifier}
      subscriberHash={subscriberHash}
      backendUrl={backendUrl}
      apiUrl={apiUrl}
      socketUrl={socketUrl}
      useCache={useCache}
      userAgentType="hooks"
      subscriber={buildSubscriber(subscriberId, subscriber)}
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
  apiUrl,
  socketUrl,
  useCache,
  subscriber,
  userAgentType,
}: NovuProviderProps & { userAgentType: 'components' | 'hooks' }) => {
  const novu = useMemo(
    () =>
      new Novu({
        applicationIdentifier,
        subscriberHash,
        backendUrl,
        apiUrl,
        socketUrl,
        useCache,
        __userAgent: `${baseUserAgent} ${userAgentType}`,
        ...(subscriber ? { subscriber } : { subscriberId: subscriberId as string }),
      }),
    [
      applicationIdentifier,
      subscriberId,
      subscriberHash,
      backendUrl,
      apiUrl,
      socketUrl,
      useCache,
      subscriber,
      userAgentType,
    ]
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

function buildSubscriber(subscriberId: string | undefined, subscriber: Subscriber | string | undefined): Subscriber {
  let subscriberObj: Subscriber;

  if (subscriber) {
    subscriberObj = typeof subscriber === 'string' ? { subscriberId: subscriber } : subscriber;
  } else {
    subscriberObj = { subscriberId: subscriberId as string };
  }

  return subscriberObj;
}

import { Novu, NovuOptions, StandardNovuOptions, Subscriber } from '@novu/js';
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

export const NovuProvider = (props: NovuProviderProps) => {
  const applicationIdentifier = 'applicationIdentifier' in props ? props.applicationIdentifier : undefined;
  const subscriberHash = 'subscriberHash' in props ? props.subscriberHash : undefined;
  const backendUrl = 'backendUrl' in props ? props.backendUrl : undefined;
  const apiUrl = 'apiUrl' in props ? props.apiUrl : undefined;
  const socketUrl = 'socketUrl' in props ? props.socketUrl : undefined;
  const useCache = 'useCache' in props ? props.useCache : undefined;
  const subscriber = 'subscriber' in props ? props.subscriber : undefined;
  const subscriberId = 'subscriberId' in props ? props.subscriberId : undefined;
  const subscriberObj = buildSubscriber(subscriberId, subscriber);

  const providerProps =
    applicationIdentifier && subscriber
      ? ({
          applicationIdentifier,
          subscriberHash,
          backendUrl,
          apiUrl,
          socketUrl,
          useCache,
          subscriber: subscriberObj,
        } satisfies StandardNovuOptions)
      : {};

  return (
    <InternalNovuProvider {...providerProps} userAgentType="hooks">
      {props.children}
    </InternalNovuProvider>
  );
};

/**
 * @internal Should be used internally not to be exposed outside of the library
 * This is needed to differentiate between the hooks and components user agents
 * Better to use this internally to avoid confusion.
 */
export const InternalNovuProvider = (props: NovuProviderProps & { userAgentType: 'components' | 'hooks' }) => {
  const applicationIdentifier = 'applicationIdentifier' in props ? props.applicationIdentifier : '';
  const subscriberHash = 'subscriberHash' in props ? props.subscriberHash : '';
  const backendUrl = 'backendUrl' in props ? props.backendUrl : '';
  const apiUrl = 'apiUrl' in props ? props.apiUrl : '';
  const socketUrl = 'socketUrl' in props ? props.socketUrl : '';
  const useCache = 'useCache' in props ? props.useCache : undefined;
  const subscriber = 'subscriber' in props ? props.subscriber : undefined;
  const subscriberId = 'subscriberId' in props ? props.subscriberId : undefined;

  const novu = useMemo(
    () =>
      new Novu({
        applicationIdentifier,
        subscriberHash,
        backendUrl,
        apiUrl,
        socketUrl,
        useCache,
        __userAgent: `${baseUserAgent} ${props.userAgentType}`,
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
      props.userAgentType,
    ]
  );

  return <NovuContext.Provider value={novu}>{props.children}</NovuContext.Provider>;
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

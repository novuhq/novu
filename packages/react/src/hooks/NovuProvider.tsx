import { Novu, NovuOptions } from '@novu/js';
import { buildSubscriber } from '@novu/js/internal';
import { createContext, ReactNode, useContext, useEffect, useMemo } from 'react';

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
  const { subscriberId, ...propsWithoutSubscriberId } = props;
  const subscriberObj = buildSubscriber({ subscriberId, subscriber: props.subscriber });
  const applicationIdentifier = propsWithoutSubscriberId.applicationIdentifier
    ? propsWithoutSubscriberId.applicationIdentifier
    : '';

  const providerProps: NovuProviderProps = {
    ...propsWithoutSubscriberId,
    applicationIdentifier,
    subscriber: subscriberObj,
  };

  return (
    <InternalNovuProvider {...providerProps} applicationIdentifier={applicationIdentifier} userAgentType="hooks">
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
  const applicationIdentifier = props.applicationIdentifier || '';
  const subscriberObj = buildSubscriber({ subscriberId: props.subscriberId, subscriber: props.subscriber });

  const { children, subscriberId, subscriberHash, backendUrl, apiUrl, socketUrl, useCache, userAgentType } = props;

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
        subscriber: subscriberObj,
      }),
    [applicationIdentifier, subscriberHash, backendUrl, apiUrl, socketUrl, useCache, userAgentType]
  );

  useEffect(() => {
    novu.changeSubscriber({
      subscriber: subscriberObj,
      subscriberHash: props.subscriberHash,
    });
  }, [subscriberObj.subscriberId, props.subscriberHash, novu]);

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

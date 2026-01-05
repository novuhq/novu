import { Novu, NovuOptions } from '@novu/js';
import { buildSubscriber } from '@novu/js/internal';
import { createContext, ReactNode, useContext, useMemo } from 'react';

// @ts-expect-error
const version = PACKAGE_VERSION;
// @ts-expect-error
const name = PACKAGE_NAME;
const baseUserAgent = `${name}@${version}`;

export type NovuProviderProps = NovuOptions & {
  children: ReactNode;
};

const NovuContext = createContext<Novu | undefined>(undefined);

export const NovuProvider = (props: NovuProviderProps) => {
  const { subscriberId, ...propsWithoutSubscriberId } = props;
  const subscriberObj = useMemo(
    () => buildSubscriber({ subscriberId, subscriber: props.subscriber }),
    [subscriberId, props.subscriber]
  );
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
  const subscriberObj = useMemo(
    () => buildSubscriber({ subscriberId: props.subscriberId, subscriber: props.subscriber }),
    [props.subscriberId, props.subscriber]
  );

  const {
    children,
    subscriberHash,
    contextHash,
    backendUrl,
    apiUrl,
    socketUrl,
    useCache,
    userAgentType,
    defaultSchedule,
    context,
  } = props;

  const novu = useMemo(
    () =>
      new Novu({
        applicationIdentifier,
        subscriberHash,
        contextHash,
        backendUrl,
        apiUrl,
        socketUrl,
        useCache,
        __userAgent: `${baseUserAgent} ${userAgentType}`,
        subscriber: subscriberObj,
        defaultSchedule,
        context,
      }),
    [
      applicationIdentifier,
      subscriberHash,
      subscriberObj,
      context,
      contextHash,
      backendUrl,
      apiUrl,
      socketUrl,
      useCache,
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

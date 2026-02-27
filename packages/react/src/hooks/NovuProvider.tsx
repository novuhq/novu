import { Novu, NovuOptions } from '@novu/js';
import { buildSubscriber } from '@novu/js/internal';
import { createContext, ReactNode, useContext, useMemo } from 'react';

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
    <InternalNovuProvider {...providerProps} applicationIdentifier={applicationIdentifier}>
      {props.children}
    </InternalNovuProvider>
  );
};

/**
 * @internal Should be used internally not to be exposed outside of the library
 */
export const InternalNovuProvider = (props: NovuProviderProps) => {
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
    socketOptions,
    useCache,
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
        socketOptions,
        useCache,
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
      socketOptions,
      useCache,
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

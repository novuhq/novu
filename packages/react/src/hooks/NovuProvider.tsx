import { Novu, NovuOptions } from '@novu/js';
import { buildSubscriber } from '@novu/js/internal';
import { createContext, ReactNode, useContext, useMemo } from 'react';

export type NovuProviderProps = NovuOptions & {
  /**
   * When `false`, disables the WebSocket subscription that auto-injects
   * newly received notifications into the list and subscription that auto-resync
   * notification counts. Built-in mutations like
   * `readAll`, `seenAll`, `archiveAll`, and `archiveAllRead` continue to
   * update local state. Use this when you want to drive new-notification updates yourself (e.g.
   * via your own `novu.on('notifications.notification_received', ...)`
   * handler combined with `refetch()`). Defaults to `true`.
   */
  realtime?: boolean;
  children: ReactNode;
};

const NovuContext = createContext<{ novu: Novu; realtime: boolean }>({ novu: undefined as any, realtime: true });

export const NovuProvider = (props: NovuProviderProps) => {
  const { subscriberId, realtime = true, ...propsWithoutSubscriberId } = props;
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
    realtime,
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
    realtime = true,
  } = props;

  const value = useMemo(
    () => ({
      novu: new Novu({
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
      realtime,
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
      realtime,
    ]
  );

  return <NovuContext.Provider value={value}>{children}</NovuContext.Provider>;
};

export const useNovu = () => {
  const context = useContext(NovuContext);
  if (!context.novu) {
    throw new Error('useNovu must be used within a <NovuProvider />');
  }

  return context.novu;
};

export const useUnsafeNovu = () => {
  const context = useContext(NovuContext);

  return context.novu;
};

export const useRealtime = () => {
  const context = useContext(NovuContext);

  return context.realtime;
};

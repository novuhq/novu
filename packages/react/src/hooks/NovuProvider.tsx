import { GetToken, Novu, NovuError, NovuOptions, StandardNovuOptions, TokenNovuOptions } from '@novu/js';
import { buildSubscriber } from '@novu/js/internal';
import { createContext, ReactNode, useContext, useEffect, useMemo, useRef } from 'react';
import { useDataRef } from './internal/useDataRef';
import { useDisconnectReleasedNovu } from './internal/useDisconnectReleasedNovu';
import { useStableValue } from './internal/useStableValue';

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

const NovuContext = createContext<{ novu: Novu | undefined; realtime: boolean }>({ novu: undefined, realtime: true });

/**
 * Opens one Novu client for its children. The hooks below it show the data of whoever is signed in, and refetch when
 * another subscriber or context signs in.
 *
 * On sign-out, unmount `NovuProvider` or change its `key`. With a token source the client learns of a new user only at
 * the next renewal, and until then it keeps the previous user's session; a token route that answers 401 after
 * sign-out is retried every 10 seconds.
 */
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

type InternalNovuProviderProps = NovuOptions & {
  realtime?: boolean;
  children: ReactNode;
};

type TokenSource = { getToken: GetToken; tokenEndpoint?: never } | { tokenEndpoint: string; getToken?: never };

/**
 * @internal Should be used internally not to be exposed outside of the library
 */
export const InternalNovuProvider = (props: InternalNovuProviderProps) => {
  const applicationIdentifier = props.applicationIdentifier || '';
  // Compared by value: inline objects would otherwise create a new Novu instance, session and socket on every render
  const subscriberObj = useStableValue(
    buildSubscriber({ subscriberId: props.subscriberId, subscriber: props.subscriber })
  );
  const context = useStableValue(props.context);
  const socketOptions = useStableValue(props.socketOptions);

  const {
    children,
    subscriberHash,
    contextHash,
    backendUrl,
    apiUrl,
    socketUrl,
    useCache,
    defaultSchedule,
    realtime = true,
    tokenEndpoint,
  } = props;
  const getTokenRef = useDataRef(props.getToken);
  const hasGetToken = Boolean(props.getToken);
  // A server-rendered token is only good for the first session, so only the first Novu instance gets it.
  const initialToken = useRef(props.initialToken).current;
  const firstNovuCommitted = useRef(false);
  useEffect(() => {
    firstNovuCommitted.current = true;
  }, []);
  const tokenSource = useMemo((): TokenSource | undefined => {
    if (hasGetToken) {
      const getToken: GetToken = async () => {
        const latest = getTokenRef.current;
        if (!latest) {
          throw new NovuError('getToken was removed from the Novu provider', undefined);
        }

        return latest();
      };

      return { getToken };
    }

    return tokenEndpoint ? { tokenEndpoint } : undefined;
  }, [hasGetToken, tokenEndpoint]);

  const value = useMemo(() => {
    const options = {
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
    } satisfies StandardNovuOptions;

    const tokenOptions = tokenSource && {
      ...options,
      ...tokenSource,
      initialToken: firstNovuCommitted.current ? undefined : initialToken,
    };

    return {
      // The subscriber props still reach a token source, so Novu can warn that they are ignored.
      novu: new Novu(tokenOptions ? (tokenOptions satisfies TokenNovuOptions) : options),
      realtime,
    };
  }, [
    tokenSource,
    initialToken,
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
  ]);

  useDisconnectReleasedNovu(value.novu);

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

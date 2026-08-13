import { NovuProvider } from '@novu/react';
import { type ComponentProps, createContext, type ReactNode, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { createContextHook } from '@/utils/context';

type ConnectSubscriberContextValue = {
  subscriberId: string;
  isReady: boolean;
};

const ConnectSubscriberContext = createContext<ConnectSubscriberContextValue>({
  subscriberId: '',
  isReady: false,
});

export const useConnectSubscriber = createContextHook(ConnectSubscriberContext);

type ConnectSubscriberProviderProps = {
  children?: ReactNode;
  /** When set, the customer-env Novu session uses this id instead of the dashboard user id. */
  subscriberIdOverride?: string;
};

type NovuProviderChildren = ComponentProps<typeof NovuProvider>['children'];

export function ConnectSubscriberProvider({ children, subscriberIdOverride }: ConnectSubscriberProviderProps) {
  const { currentUser, isUserLoaded } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const isReady = isUserLoaded && !!currentUser?._id && !!currentEnvironment?.identifier;
  const subscriberId = subscriberIdOverride || currentUser?._id || '';
  const routedContent = (children === undefined ? <Outlet /> : children) as NovuProviderChildren;
  const subscriber = useMemo(
    () => ({
      subscriberId,
      firstName: currentUser?.firstName ?? '',
      lastName: currentUser?.lastName ?? '',
      email: currentUser?.email ?? '',
      avatar: currentUser?.profilePicture ?? '',
    }),
    [subscriberId, currentUser?.firstName, currentUser?.lastName, currentUser?.email, currentUser?.profilePicture]
  );

  if (!isReady) {
    return (
      <ConnectSubscriberContext.Provider value={{ subscriberId, isReady: false }}>
        {routedContent}
      </ConnectSubscriberContext.Provider>
    );
  }

  return (
    <ConnectSubscriberContext.Provider value={{ subscriberId, isReady: true }}>
      <NovuProvider
        key={subscriberId}
        subscriberId={subscriberId}
        subscriber={subscriber}
        applicationIdentifier={currentEnvironment.identifier}
        apiUrl={apiHostnameManager.getHostname()}
        socketUrl={apiHostnameManager.getWebSocketHostname()}
      >
        {routedContent}
      </NovuProvider>
    </ConnectSubscriberContext.Provider>
  );
}

import { NovuProvider } from '@novu/react';
import { createContext, type ComponentProps, type ReactNode } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { buildConnectSubscriberId } from '@/utils/connect-subscriber-id';
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
};

type NovuProviderChildren = ComponentProps<typeof NovuProvider>['children'];

export function ConnectSubscriberProvider({ children }: ConnectSubscriberProviderProps) {
  const { currentUser, isUserLoaded } = useAuth();
  const { currentEnvironment } = useEnvironment();

  const isReady = isUserLoaded && !!currentUser?._id && !!currentEnvironment?.identifier;
  const subscriberId = currentUser?._id ? buildConnectSubscriberId(currentUser._id) : '';
  const routedContent = (children === undefined ? <Outlet /> : children) as NovuProviderChildren;

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
        subscriber={{
          subscriberId,
          firstName: currentUser.firstName ?? '',
          lastName: currentUser.lastName ?? '',
          email: currentUser.email ?? '',
          avatar: currentUser.profilePicture ?? '',
        }}
        applicationIdentifier={currentEnvironment.identifier}
        apiUrl={apiHostnameManager.getHostname()}
        socketUrl={apiHostnameManager.getWebSocketHostname()}
      >
        {routedContent}
      </NovuProvider>
    </ConnectSubscriberContext.Provider>
  );
}

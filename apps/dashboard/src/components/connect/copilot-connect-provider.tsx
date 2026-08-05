import { useUser } from '@clerk/react';
import { NovuProvider } from '@novu/react';
import { useQuery } from '@tanstack/react-query';
import { type ComponentProps, type ReactNode, useMemo } from 'react';
import { getNovuInboxContext } from '@/api/novu-context';
import { APP_ID, IS_SELF_HOSTED } from '@/config';
import { useAuth } from '@/context/auth/hooks';
import { useEnvironment } from '@/context/environment/hooks';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { CopilotConnectContextValue } from './copilot-connect-context';

type NovuProviderChildren = ComponentProps<typeof NovuProvider>['children'];

type CopilotConnectProviderProps = {
  children: ReactNode;
  /**
   * Rendered in place of `children` while the tenant context is still being minted (or its
   * prerequisites aren't ready yet). Lets consumers show a skeleton instead of a blank gap.
   * Never rendered on self-hosted, where the whole flow is disabled.
   */
  fallback?: ReactNode;
};

function isNovuProductionTarget(): boolean {
  const isProdDashboard = window.location.hostname.includes('dashboard.novu.co');
  const isStaging = apiHostnameManager.getHostname() === 'https://api.novu-staging.co';

  return isProdDashboard || isStaging;
}

function resolveNovuProdApiUrl(): string {
  return isNovuProductionTarget() ? 'https://api.novu.co' : apiHostnameManager.getHostname();
}

function resolveNovuProdSocketUrl(): string {
  return isNovuProductionTarget() ? 'https://ws.novu.co' : apiHostnameManager.getWebSocketHostname();
}

/**
 * A second `NovuProvider` scoped to Novu's own (production) Novu account — the same `APP_ID`,
 * subscriber identity, and prod API the dashboard already dogfoods for its Inbox (see
 * `inbox-button.tsx`). Connect components rendered under it (e.g. the NovuCopilot
 * `SlackConnectButton`) authenticate as that Novu-prod subscriber, so the resulting workspace
 * connection lives under Novu's hosted agent org rather than the customer's environment.
 */
export function CopilotConnectProvider({ children, fallback = null }: CopilotConnectProviderProps) {
  const { user } = useUser();
  const { currentEnvironment } = useEnvironment();
  const { currentOrganization } = useAuth();

  const subscriber = useMemo(
    () => ({
      subscriberId: user?.externalId ?? '',
      email: user?.primaryEmailAddress?.emailAddress ?? user?.emailAddresses?.[0]?.emailAddress ?? '',
      firstName: user?.firstName ?? '',
      lastName: user?.lastName ?? '',
    }),
    [user?.externalId, user?.primaryEmailAddress?.emailAddress, user?.emailAddresses, user?.firstName, user?.lastName]
  );

  // Mint the tenant context + contextHash + subscriberHash from the customer-authenticated
  // backend (signed with the hosted agent environment's secret). The subscriberHash is minted
  // for exactly this userId so the hosted Inbox session HMAC-verifies it.
  const { data: connectContext, isLoading: isConnectContextLoading } = useQuery({
    queryKey: ['novu-context', currentEnvironment?._id, user?.externalId],
    queryFn: ({ signal }) => {
      if (!currentEnvironment) {
        throw new Error('No environment selected');
      }

      return getNovuInboxContext(currentEnvironment, signal);
    },
    enabled: !IS_SELF_HOSTED && !!currentEnvironment?._id && !!currentOrganization?._id && !!user?.externalId,
    staleTime: 5 * 60 * 1000,
  });

  if (IS_SELF_HOSTED) {
    return null;
  }

  const isContextReady =
    !!user?.externalId && !!currentEnvironment && !!currentOrganization && !isConnectContextLoading;

  if (!isContextReady) {
    return <>{fallback}</>;
  }

  return (
    <NovuProvider
      subscriber={subscriber}
      applicationIdentifier={APP_ID}
      apiUrl={resolveNovuProdApiUrl()}
      socketUrl={resolveNovuProdSocketUrl()}
      subscriberHash={connectContext?.subscriberHash}
      context={connectContext?.context}
      contextHash={connectContext?.contextHash}
    >
      <CopilotConnectContextValue.Provider value={connectContext}>
        {children as NovuProviderChildren}
      </CopilotConnectContextValue.Provider>
    </NovuProvider>
  );
}

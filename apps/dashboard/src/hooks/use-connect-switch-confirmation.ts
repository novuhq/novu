import { useOrganizationList } from '@clerk/react';
import { type MouseEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useCrossAppNavigation } from '@/hooks/use-cross-app-navigation';
import { APP_IDS, type AppId } from '@/utils/apps';
import { hasExplicitConnectMembership, withConnectProvisioningIntent } from '@/utils/connect';

type UseConnectSwitchConfirmationOptions = {
  targetAppId: AppId;
  href: string;
  openInNewTab?: boolean;
};

export function useConnectSwitchConfirmation({
  targetAppId,
  href,
  openInNewTab = false,
}: UseConnectSwitchConfirmationOptions) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigateCrossApp = useCrossAppNavigation();
  const { userMemberships, isLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  useEffect(() => {
    if (!isLoaded || !userMemberships?.hasNextPage || userMemberships?.isFetching) {
      return;
    }

    userMemberships.fetchNext?.();
  }, [isLoaded, userMemberships?.hasNextPage, userMemberships?.isFetching, userMemberships]);

  const isMembershipReady = isLoaded && !userMemberships?.isFetching && userMemberships?.hasNextPage !== true;

  const hasExplicitConnectOrganization = useMemo(() => {
    if (!isMembershipReady || !userMemberships?.data) {
      return false;
    }

    return hasExplicitConnectMembership(userMemberships.data);
  }, [isMembershipReady, userMemberships?.data]);

  const handleSwitcherClick = useCallback(
    (event: MouseEvent<HTMLAnchorElement>) => {
      if (targetAppId !== APP_IDS.CONNECT) {
        return;
      }

      if (isMembershipReady && hasExplicitConnectOrganization) {
        return;
      }

      event.preventDefault();
      setIsModalOpen(true);
    },
    [targetAppId, isMembershipReady, hasExplicitConnectOrganization]
  );

  const handleConfirm = useCallback(() => {
    setIsModalOpen(false);
    navigateCrossApp(withConnectProvisioningIntent(href), openInNewTab);
  }, [href, navigateCrossApp, openInNewTab]);

  return {
    isModalOpen,
    setIsModalOpen,
    handleSwitcherClick,
    handleConfirm,
    showConnectSwitchModal: targetAppId === APP_IDS.CONNECT,
  };
}

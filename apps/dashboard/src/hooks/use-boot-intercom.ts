import { useEffect } from 'react';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { useIntercom } from 'react-use-intercom';
import { INTERCOM_APP_ID } from '../config';
import { useAuth } from '@/context/auth/hooks';

export function useBootIntercom() {
  const { currentOrganization, currentUser } = useAuth();
  const { boot } = useIntercom();

  useEffect(() => {
    const shouldBootIntercom = !!INTERCOM_APP_ID && currentUser && currentOrganization;
    if (shouldBootIntercom) {
      boot({
        userId: currentUser._id,
        email: currentUser?.email ?? '',
        name: `${currentUser?.firstName} ${currentUser?.lastName}`,
        createdAt: currentUser?.createdAt,
        company: {
          name: currentOrganization?.name,
          companyId: currentOrganization?._id as string,
        },
        userHash: currentUser.servicesHashes?.intercom,
        customLauncherSelector: '#intercom-launcher',
        hideDefaultLauncher: true,
      });
    }
  }, [boot, currentUser, currentOrganization]);
}

import { apiHostnameManager } from '@/utils/api-hostname-manager';
import { useUser } from '@clerk/clerk-react';
import { Inbox, InboxContent, InboxProps } from '@novu/react';
import { useAuth } from '../../context/auth/hooks';
import { useFetchEnvironments } from '../../context/environment/hooks';

const defaultTabs = [
  {
    label: 'All',
    filter: { tags: [] },
  },
  {
    label: 'Promotions',
    filter: { tags: ['promotions'] },
  },
  {
    label: 'Security Alerts',
    filter: { tags: ['security', 'alert'] },
  },
];

export function InboxPreviewContent() {
  const auth = useAuth();
  const { user } = useUser();
  const { environments } = useFetchEnvironments({ organizationId: auth?.currentOrganization?._id });
  const currentEnvironment = environments?.find((env) => !env._parentId);

  if (!currentEnvironment || !user) {
    return null;
  }

  const configuration: InboxProps = {
    applicationIdentifier: currentEnvironment?.identifier,
    subscriberId: user?.externalId as string,
    backendUrl: apiHostnameManager.getHostname(),
    socketUrl: apiHostnameManager.getWebSocketHostname(),
    localization: {
      'notifications.emptyNotice': 'Click Send Notification to see your first notification',
    },
    appearance: {
      variables: {
        colorPrimary: '#DD2450',
      },
      elements: {
        inboxHeader: {
          backgroundColor: 'white',
        },
        preferencesHeader: {
          backgroundColor: 'white',
        },
        tabsList: {
          backgroundColor: 'white',
        },
        inboxContent: {
          maxHeight: '460px',
        },
        notificationListContainer: {
          minHeight: '100%',
        },
        notificationListEmptyNoticeContainer: {
          height: '100%',
        },
        notificationListEmptyNotice: {
          marginTop: '-32px',
        },
      },
    },
    tabs: defaultTabs,
  };

  return (
    <div className="hide-inbox-footer nv-no-scrollbar mt-1 h-[470px] w-[370px] overflow-y-auto overflow-x-hidden">
      <Inbox {...configuration}>
        <InboxContent />
      </Inbox>
    </div>
  );
}

import { Inbox, InboxContent, InboxProps } from '@novu/react';
import { SOCKET_OPTIONS } from '@/config';
import { useDashboardInboxIdentity } from '@/hooks/use-dashboard-inbox-identity';
import { apiHostnameManager } from '@/utils/api-hostname-manager';
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
  const { environments } = useFetchEnvironments({ organizationId: auth?.currentOrganization?._id });
  const developmentEnvironment = environments?.find((env) => !env._parentId);
  const inboxIdentity = useDashboardInboxIdentity(developmentEnvironment);

  if (!developmentEnvironment || inboxIdentity.status !== 'ready') {
    return null;
  }

  const configuration: InboxProps = {
    ...inboxIdentity.identity,
    applicationIdentifier: developmentEnvironment.identifier,
    backendUrl: apiHostnameManager.getHostname(),
    socketUrl: apiHostnameManager.getWebSocketHostname(),
    socketOptions: SOCKET_OPTIONS,
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
          maxHeight: '100%',
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
    <div className="hide-inbox-footer nv-no-scrollbar mt-1 h-full w-full overflow-y-auto overflow-x-hidden">
      <Inbox key={inboxIdentity.remountKey} {...configuration}>
        <InboxContent />
      </Inbox>
    </div>
  );
}

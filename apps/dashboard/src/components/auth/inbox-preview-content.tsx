import { Inbox, InboxContent, InboxProps } from '@novu/react';
import { useFetchEnvironments } from '../../context/environment/hooks';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '../../context/auth/hooks';
import { API_HOSTNAME, WEBSOCKET_HOSTNAME } from '../../config';
import { useNavigate } from 'react-router-dom';

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
  const navigate = useNavigate();
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
    backendUrl: API_HOSTNAME ?? 'https://api.novu.co',
    socketUrl: WEBSOCKET_HOSTNAME ?? 'https://ws.novu.co',
    localization: {
      'notifications.emptyNotice': 'Click Send Notification to see your first notification',
    },
    appearance: {
      variables: {},
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
      },
    },
    tabs: defaultTabs,
  };

  return (
    <>
      <style>
        {`
          .nt-relative.nt-flex.nt-shrink-0.nt-flex-col.nt-justify-center.nt-items-center.nt-gap-1.nt-mt-auto.nt-py-3.nt-text-foreground-alpha-400 {
            display: none !important;
          }
          .inbox-scroll-container {
            height: 500px;
            overflow-y: auto;
            overflow-x: hidden;
            /* Hide scrollbar for Chrome, Safari and Opera */
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* Internet Explorer 10+ */
          }
          .inbox-scroll-container::-webkit-scrollbar {
            display: none; /* Hide scrollbar for Chrome, Safari and Opera */
          }
          /* Hide scrollbars for all elements within the inbox */
          .inbox-scroll-container * {
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none; /* Internet Explorer 10+ */
          }
          .inbox-scroll-container *::-webkit-scrollbar {
            display: none; /* Hide scrollbar for Chrome, Safari and Opera */
          }
        `}
      </style>
      <div className="inbox-scroll-container mt-1 h-[470px] w-[375px]">
        <Inbox
          {...configuration}
          routerPush={(path: string) => {
            return navigate(path);
          }}
        >
          <InboxContent />
        </Inbox>
      </div>
    </>
  );
}

import { Inbox, InboxContent, InboxProps } from '@novu/react';
import { SVGProps } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useFetchEnvironments } from '../../context/environment/hooks';
import { useUser } from '@clerk/clerk-react';
import { useAuth } from '../../context/auth/hooks';
import { API_HOSTNAME, WEBSOCKET_HOSTNAME } from '../../config';
import { useNavigate } from 'react-router-dom';

interface InboxPreviewContentProps {
  selectedStyle: string;
  hasNotificationBeenSent?: boolean;
  primaryColor: string;
  foregroundColor: string;
}

export function InboxPreviewContent({
  selectedStyle,
  hasNotificationBeenSent,
  primaryColor,
  foregroundColor,
}: InboxPreviewContentProps) {
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
      variables: {
        colorPrimary: primaryColor,
        colorForeground: foregroundColor,
      },
      elements: {
        inbox__popoverContent: {
          maxHeight: '440px',
        },
        button: {
          fontSize: '12px',
          lineHeight: '24px',
          height: '24px',
          borderRadius: '6px',
        },
        notificationBody: {
          colorForeground: `color-mix(in srgb, ${foregroundColor} 70%, white)`,
        },
        notification: {
          paddingRight: '12px',
        },
      },
    },
  };

  return (
    <>
      {selectedStyle === 'popover' && (
        <div className="relative flex h-full w-full flex-col items-center">
          <div className="mt-10 flex w-full max-w-[440px] items-center justify-end">
            <Inbox
              {...configuration}
              routerPush={(path: string) => {
                return navigate(path);
              }}
              placement="bottom-end"
              open
            />
          </div>
          <div className="absolute bottom-[-10px] left-2 flex flex-col items-start">
            <SendNotificationArrow className="mt-2 h-[73px] w-[86px]" />
            <AnimatePresence mode="wait">
              <motion.p
                key={hasNotificationBeenSent ? 'implement' : 'send'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{
                  type: 'spring',
                  duration: 0.2,
                }}
                className="text-success relative top-[-32px] max-w-[200px] text-[10px] italic leading-[12px]"
              >
                {hasNotificationBeenSent
                  ? 'Click to implement the Inbox in your application now'
                  : 'Hit send, to get an notification!'}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      )}
      {selectedStyle === 'sidebar' && (
        <div className="h-full">
          <div className="h-full w-[350px] border-r">
            <Inbox {...configuration}>
              <InboxContent />
            </Inbox>
          </div>
        </div>
      )}
      {selectedStyle === 'full-width' && (
        <div className="h-full w-full">
          <Inbox {...configuration}>
            <InboxContent />
          </Inbox>
        </div>
      )}
    </>
  );
}

function SendNotificationArrow(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="87" height="73" viewBox="0 0 87 73" fill="none" {...props}>
      <path
        d="M46.7042 38.5367C45.9523 34.1342 42.2234 19.9485 34.0857 23.4153C31.7808 24.3973 29.2755 28.6188 31.7983 30.67C35.1624 33.4054 37.9395 27.6374 37.3445 24.9824C35.7772 17.9881 26.4508 15.3565 20.157 16.3625C14.8716 17.2074 10.2676 20.6788 6.61735 24.3822C4.90504 26.1195 4.21087 28.3203 2.65616 30.084C0.250967 32.8124 2.04904 28.0442 2.01456 26.0896C1.94411 22.0956 2.26233 28.5742 2.27848 29.9515C2.30512 32.224 7.85706 30.608 10.037 30.3405"
        stroke="#1FC16B"
        strokeLinecap="round"
      />
    </svg>
  );
}

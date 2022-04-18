import { NotificationCenter, NovuProvider } from '@novu/bell';
import { IMessage } from '@novu/shared';
import { useEffect, useState } from 'react';

interface INotificationCenterWidgetProps {
  onUrlChange: (url: string) => void;
  onNotificationClick: (notification: IMessage) => void;
  onUnseenCountChanged: (unseenCount: number) => void;
  applicationIdentifier: string | undefined;
}

export function NotificationCenterWidget(props: INotificationCenterWidgetProps) {
  const [userDataPayload, setUserDataPayload] = useState<{ $user_id: string }>();

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = async (event: { data: any }) => {
      if (event.data.type === 'INIT_IFRAME') {
        setUserDataPayload(event.data.value.data);
      }
    };

    // eslint-disable-next-line no-console
    console.log('HANDLER', handler, process.env.NODE_ENV);

    if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line
      (window as any).initHandler = handler;
    }

    window.addEventListener('message', handler);

    return () => window.removeEventListener('message', handler);
  }, []);

  if (!userDataPayload) return null;

  // eslint-disable-next-line no-console
  console.log(userDataPayload);

  return (
    <NovuProvider
      applicationIdentifier={props.applicationIdentifier as string}
      subscriberId={userDataPayload.$user_id}
      colorScheme="light"
      //
    >
      <NotificationCenter
        onNotificationClick={props.onNotificationClick}
        onUrlChange={props.onUrlChange}
        onUnseenCountChanged={props.onUnseenCountChanged}
      />
    </NovuProvider>
  );
}

import { NotificationCenter, NovuProvider } from '@novu/notification-center';
import { IMessage, IOrganizationEntity } from '@novu/shared';
import React, { useEffect, useState } from 'react';
import * as WebFont from 'webfontloader';
import { API_URL, WS_URL } from '../../config';
import { createGlobalStyle } from 'styled-components';

interface INotificationCenterWidgetProps {
  onUrlChange: (url: string) => void;
  onNotificationClick: (notification: IMessage) => void;
  onUnseenCountChanged: (unseenCount: number) => void;
  applicationIdentifier: string | undefined;
  backendUrl: string;
}

export function NotificationCenterWidget(props: INotificationCenterWidgetProps) {
  const [userDataPayload, setUserDataPayload] = useState<{ subscriberId: string; subscriberHash: string }>();
  const [fontFamily, setFontFamily] = useState<string>('Lato');

  useEffect(() => {
    WebFont.load({
      google: {
        families: [fontFamily],
      },
    });
  }, [fontFamily]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = async (event: { data: any }) => {
      if (event.data.type === 'INIT_IFRAME') {
        setUserDataPayload(event.data.value.data);
      }
    };

    if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line
      (window as any).initHandler = handler;
    }

    window.addEventListener('message', handler);

    return () => window.removeEventListener('message', handler);
  }, []);

  function onLoad({ organization }: { organization: IOrganizationEntity }) {
    setFontFamily(organization?.branding?.fontFamily || 'Lato');
  }

  if (!userDataPayload) return null;

  return (
    <>
      <GlobalStyle fontFamily={fontFamily} />
      <NovuProvider
        backendUrl={props.backendUrl as string}
        socketUrl={WS_URL}
        applicationIdentifier={props.applicationIdentifier as string}
        subscriberId={userDataPayload.subscriberId}
        onLoad={onLoad}
        subscriberHash={userDataPayload.subscriberHash}
      >
        <NotificationCenter
          colorScheme="light"
          onNotificationClick={props.onNotificationClick}
          onUrlChange={props.onUrlChange}
          onUnseenCountChanged={props.onUnseenCountChanged}
        />
      </NovuProvider>
    </>
  );
}

const GlobalStyle = createGlobalStyle<{ fontFamily: string }>`
  body {
    margin: 0;
    font-family: ${({ fontFamily }) => fontFamily}, Helvetica, sans-serif;
    color: #333737;
  }
`;

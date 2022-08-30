import { I18NLanguage, NotificationCenter, NovuProvider, ITranslationEntry } from '@novu/notification-center';
import { INovuThemeProvider } from '@novu/notification-center';
import { IMessage, IOrganizationEntity, ButtonTypeEnum } from '@novu/shared';
import { useEffect, useState } from 'react';
import * as WebFont from 'webfontloader';
import { API_URL, WS_URL } from '../../config';
import { createGlobalStyle } from 'styled-components';

interface INotificationCenterWidgetProps {
  onUrlChange: (url: string) => void;
  onNotificationClick: (notification: IMessage) => void;
  onUnseenCountChanged: (unseenCount: number) => void;
  onActionClick: (templateIdentifier: string, type: ButtonTypeEnum, message: IMessage) => void;
  applicationIdentifier: string | undefined;
}

export function NotificationCenterWidget(props: INotificationCenterWidgetProps) {
  const [userDataPayload, setUserDataPayload] = useState<{ subscriberId: string; subscriberHash: string }>();
  const [backendUrl, setBackendUrl] = useState(API_URL);
  const [socketUrl, setSocketUrl] = useState(WS_URL);
  const [theme, setTheme] = useState<INovuThemeProvider>({});
  const [fontFamily, setFontFamily] = useState<string>('Lato');
  const [frameInitialized, setFrameInitialized] = useState(false);
  const [i18n, setI18n] = useState<ITranslationEntry>();

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

        if (event.data.value.backendUrl) {
          setBackendUrl(event.data.value.backendUrl);
        }

        if (event.data.value.socketUrl) {
          setSocketUrl(event.data.value.socketUrl);
        }

        if (event.data.value.theme) {
          setTheme(event.data.value.theme);
        }

        if (event.data.value.i18n) {
          setI18n(event.data.value.i18n);
        }

        setFrameInitialized(true);
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
      {frameInitialized && (
        <NovuProvider
          backendUrl={backendUrl}
          socketUrl={socketUrl}
          applicationIdentifier={props.applicationIdentifier as string}
          subscriberId={userDataPayload.subscriberId}
          onLoad={onLoad}
          subscriberHash={userDataPayload.subscriberHash}
          i18n={i18n}
        >
          <NotificationCenter
            colorScheme="light"
            onNotificationClick={props.onNotificationClick}
            onUrlChange={props.onUrlChange}
            onUnseenCountChanged={props.onUnseenCountChanged}
            onActionClick={props.onActionClick}
            theme={theme}
          />
        </NovuProvider>
      )}
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

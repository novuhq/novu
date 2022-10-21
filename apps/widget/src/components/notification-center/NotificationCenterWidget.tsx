import { NotificationCenter, NovuProvider, ITranslationEntry, ITab, IStore } from '@novu/notification-center';
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
  const [tabs, setTabs] = useState<ITab[]>();
  const [stores, setStores] = useState<IStore[]>();

  useEffect(() => {
    WebFont.load({
      google: {
        families: [fontFamily],
      },
    });
  }, [fontFamily]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = ({ data }: any) => {
      if (data && data.type === 'INIT_IFRAME') {
        setUserDataPayload(data.value.data);

        if (data.value.backendUrl) {
          setBackendUrl(data.value.backendUrl);
        }

        if (data.value.socketUrl) {
          setSocketUrl(data.value.socketUrl);
        }

        if (data.value.theme) {
          setTheme(data.value.theme);
        }

        if (data.value.i18n) {
          setI18n(data.value.i18n);
        }

        if (data.value.tabs) {
          setTabs(data.value.tabs);
        }

        if (data.value.stores) {
          setStores(data.value.stores);
        }

        setFrameInitialized(true);
      }
    };

    if (process.env.NODE_ENV === 'test') {
      // eslint-disable-next-line
      (window as any).initHandler = handler;
    }

    window.addEventListener('message', handler);

    window.parent.postMessage({ type: 'WIDGET_READY' }, '*');

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
          stores={stores}
        >
          <NotificationCenter
            colorScheme="light"
            onNotificationClick={props.onNotificationClick}
            onUrlChange={props.onUrlChange}
            onUnseenCountChanged={props.onUnseenCountChanged}
            onActionClick={props.onActionClick}
            theme={theme}
            tabs={tabs}
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

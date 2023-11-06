import { ReactNode, useEffect, useState } from 'react';
import * as WebFont from 'webfontloader';
import { css, Global } from '@emotion/react';
import {
  NotificationCenter,
  NovuProvider,
  ITranslationEntry,
  ITab,
  IStore,
  useNovuContext,
  ColorScheme,
  IUserPreferenceSettings,
} from '@novu/notification-center';
import type { INovuThemeProvider, INotificationCenterStyles } from '@novu/notification-center';
import { IMessage, IOrganizationEntity, ButtonTypeEnum, isBrowser } from '@novu/shared';

import { API_URL, WS_URL } from '../../config';

const DEFAULT_FONT_FAMILY = 'inherit';
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
  const [fontFamily, setFontFamily] = useState<string>(DEFAULT_FONT_FAMILY);
  const [frameInitialized, setFrameInitialized] = useState(false);
  const [i18n, setI18n] = useState<ITranslationEntry>();
  const [tabs, setTabs] = useState<ITab[]>();
  const [stores, setStores] = useState<IStore[]>();
  const [styles, setStyles] = useState<INotificationCenterStyles>();
  const [colorScheme, setColorScheme] = useState<ColorScheme>('light');
  const [doLogout, setDoLogout] = useState(false);
  const [preferenceFilter, setPreferenceFilter] = useState<(userPreference: IUserPreferenceSettings) => boolean>();
  const [showUserPreferences, setShowUserPreferences] = useState<boolean>(true);

  useEffect(() => {
    if (fontFamily !== DEFAULT_FONT_FAMILY) {
      WebFont.load({
        google: {
          families: [fontFamily],
        },
      });
    }
  }, [fontFamily]);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = ({ data }: any) => {
      if (!data) return;

      if (data.type === 'INIT_IFRAME') {
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

        if (data.value.styles) {
          setStyles(data.value.styles);
        }

        if (data.value.colorScheme) {
          setColorScheme(data.value.colorScheme);
        }

        if (data.value.preferenceFilter) {
          setPreferenceFilter(() => data.value.preferenceFilter);
        }

        if (data.value.showUserPreferences) {
          setShowUserPreferences(data.value.showUserPreferences);
        }

        setFrameInitialized(true);
      }

      if (data.type === 'LOGOUT') {
        setDoLogout(true);
      }
    };

    if (process.env.NODE_ENV === 'test' || (isBrowser() && (window as any).Cypress)) {
      // eslint-disable-next-line
      (window as any).initHandler = handler;
    }

    window.addEventListener('message', handler);

    window.parent.postMessage({ type: 'WIDGET_READY' }, '*');

    return () => window.removeEventListener('message', handler);
  }, []);

  function onLoad({ organization }: { organization: IOrganizationEntity }) {
    setFontFamily(organization?.branding?.fontFamily || DEFAULT_FONT_FAMILY);
  }

  if (!userDataPayload) return null;

  return (
    <>
      <Global styles={globalStyle(fontFamily)} />
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
          styles={styles}
        >
          <NovuNotificationCenterWrapper doLogout={doLogout} setDoLogout={setDoLogout}>
            <NotificationCenter
              colorScheme={colorScheme}
              onNotificationClick={props.onNotificationClick}
              onUrlChange={props.onUrlChange}
              onUnseenCountChanged={props.onUnseenCountChanged}
              onActionClick={props.onActionClick}
              preferenceFilter={preferenceFilter}
              theme={theme}
              tabs={tabs}
              showUserPreferences={showUserPreferences}
            />
          </NovuNotificationCenterWrapper>
        </NovuProvider>
      )}
    </>
  );
}

function NovuNotificationCenterWrapper({
  children,
  doLogout,
  setDoLogout,
}: {
  children: ReactNode;
  doLogout: boolean;
  setDoLogout: (val: boolean) => void;
}) {
  const { logout } = useNovuContext();
  useEffect(() => {
    if (doLogout) {
      logout();
      setDoLogout(false);
    }
  }, [doLogout, setDoLogout]);

  return <>{children}</>;
}

const globalStyle = (fontFamily: string) => css`
  body {
    margin: 0;
    font-family: ${fontFamily}, Helvetica, sans-serif;
    color: #333737;
  }
`;

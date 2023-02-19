import React, { useContext, useState } from 'react';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Route, Routes, Navigate, BrowserRouter, useLocation } from 'react-router-dom';
import { Integrations } from '@sentry/tracing';
import decode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';
import { AuthContext } from './store/authContext';
import { applyToken, getToken, getTokenPayload, useAuthController } from './store/useAuthController';
import { ActivitiesPage } from './pages/activities/ActivitiesPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import HomePage from './pages/HomePage';
import TemplateEditorPage from './pages/templates/editor/TemplateEditorPage';
import NotificationList from './pages/templates/TemplatesListPage';
import SubscribersList from './pages/subscribers/SubscribersListPage';
import { SettingsPage } from './pages/settings/SettingsPage';
import InvitationPage from './pages/auth/InvitationPage';
import { api } from './api/api.client';
import { PasswordResetPage } from './pages/auth/PasswordResetPage';
import { ThemeContext } from './store/themeContext';
import { useThemeController } from './store/useThemeController';
import { AppLayout } from './components/layout/AppLayout';
import { MembersInvitePage } from './pages/invites/MembersInvitePage';
import { IntegrationsStore } from './pages/integrations/IntegrationsStorePage';
import CreateOrganizationPage from './pages/auth/CreateOrganizationPage';
import { ENV, SENTRY_DSN, CONTEXT_PATH, LOGROCKET_ID } from './config';
import { PromoteChangesPage } from './pages/changes/PromoteChangesPage';
import { TemplateEditorProvider } from './components/templates/TemplateEditorProvider';
import { TemplateFormProvider } from './components/templates/TemplateFormProvider';
import { SpotLight } from './components/utils/Spotlight';
import { SpotlightContext, SpotlightItem } from './store/spotlightContext';
import { LinkVercelProjectPage } from './pages/partner-integrations/LinkVercelProjectPage';
import { ROUTES } from './constants/routes.enum';
import { useBlueprint } from './hooks/useBlueprint';
import { BrandPage } from './pages/brand/BrandPage';
import { SegmentProvider } from './store/segment.context';
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';
import packageJson from '../package.json';
import { GeneralStarter } from './pages/quick-start/steps/GeneralStarter';
import { QuickStartWrapper } from './pages/quick-start/components/QuickStartWrapper';
import { Quickstart } from './pages/quick-start/steps/Quickstart';
import { NotificationCenter } from './pages/quick-start/steps/NotificationCenter';
import { FrameworkSetup } from './pages/quick-start/steps/FrameworkSetup';
import { Setup } from './pages/quick-start/steps/Setup';
import { Trigger } from './pages/quick-start/steps/Trigger';

if (LOGROCKET_ID && window !== undefined) {
  LogRocket.init(LOGROCKET_ID, {
    release: packageJson.version,
    rootHostname: 'novu.co',
    console: {
      shouldAggregateConsoleErrors: true,
    },
    network: {
      requestSanitizer: (request) => {
        // if the url contains token 'ignore' it
        if (request.url.toLowerCase().indexOf('token') !== -1) {
          // ignore the request response pair
          return null;
        }

        // remove Authorization header from logrocket
        request.headers.Authorization = undefined;

        // otherwise log the request normally
        return request;
      },
    },
  });
  setupLogRocketReact(LogRocket);
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [
      new Integrations.BrowserTracing(),
      new Sentry.Replay({
        // Additional SDK configuration goes in here, for example:
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    environment: ENV,

    /*
     * This sets the sample rate to be 10%. You may want this to be 100% while
     * in development and sample at a lower rate in production
     */
    replaysSessionSampleRate: 0.5,

    /*
     * If the entire session is not sampled, use the below sample rate to sample
     * sessions when an error occurs.
     */
    replaysOnErrorSampleRate: 1.0,

    /*
     * Set tracesSampleRate to 1.0 to capture 100%
     * of transactions for performance monitoring.
     * We recommend adjusting this value in production
     */
    tracesSampleRate: 1.0,
    beforeSend(event: Sentry.Event) {
      const logRocketSession = LogRocket.sessionURL;

      if (logRocketSession !== null || (event as string) !== '' || event !== undefined) {
        /*
         * Must ignore the next line as this variable could be null but
         * can not be null because of the check in the if statement above.
         */
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        event.extra.LogRocket = logRocketSession;

        return event;
      } else {
        return event;
      } //else
    },
  });

  LogRocket.getSessionURL((sessionURL) => {
    Sentry.configureScope((scope) => {
      scope.setExtra('sessionURL', sessionURL);
    });
  });
}

const defaultQueryFn = async ({ queryKey }: { queryKey: string }) => {
  const response = await api.get(`${queryKey[0]}`);

  return response.data?.data;
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn as any,
    },
  },
});

const tokenStoredToken: string = getToken();

applyToken(tokenStoredToken);

function App() {
  return (
    <SegmentProvider>
      <HelmetProvider>
        <BrowserRouter basename={CONTEXT_PATH}>
          <QueryClientProvider client={queryClient}>
            <AuthHandlerComponent>
              <ThemeHandlerComponent>
                <SpotLightProvider>
                  <Routes>
                    <Route path={ROUTES.AUTH_SIGNUP} element={<SignUpPage />} />
                    <Route path={ROUTES.AUTH_LOGIN} element={<LoginPage />} />
                    <Route path={ROUTES.AUTH_RESET_REQUEST} element={<PasswordResetPage />} />
                    <Route path={ROUTES.AUTH_RESET_TOKEN} element={<PasswordResetPage />} />
                    <Route path={ROUTES.AUTH_INVITATION_TOKEN} element={<InvitationPage />} />
                    <Route path={ROUTES.AUTH_APPLICATION} element={<CreateOrganizationPage />} />
                    <Route
                      path={ROUTES.PARTNER_INTEGRATIONS_VERCEL_LINK_PROJECTS}
                      element={
                        <RequiredAuth>
                          <LinkVercelProjectPage type="create" />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path={ROUTES.PARTNER_INTEGRATIONS_VERCEL_LINK_PROJECTS_EDIT}
                      element={
                        <RequiredAuth>
                          <LinkVercelProjectPage type="edit" />
                        </RequiredAuth>
                      }
                    />
                    <Route element={<AppLayout />}>
                      <Route
                        path={ROUTES.ANY}
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <HomePage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.TEMPLATES_CREATE}
                        element={
                          <RequiredAuth>
                            <TemplateFormProvider>
                              <TemplateEditorProvider>
                                <SpotLight>
                                  <TemplateEditorPage />
                                </SpotLight>
                              </TemplateEditorProvider>
                            </TemplateFormProvider>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.TEMPLATES_EDIT_TEMPLATEID}
                        element={
                          <RequiredAuth>
                            <TemplateFormProvider>
                              <TemplateEditorProvider>
                                <SpotLight>
                                  <TemplateEditorPage />
                                </SpotLight>
                              </TemplateEditorProvider>
                            </TemplateFormProvider>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.TEMPLATES}
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <NotificationList />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/general-started"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <QuickStartWrapper>
                                <GeneralStarter />
                              </QuickStartWrapper>
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.QUICKSTART}
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <Quickstart />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart/notification-center"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <NotificationCenter />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart/notification-center/set-up"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <FrameworkSetup />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart/notification-center/set-up/:framework"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <Setup />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart/notification-center/trigger"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <Trigger />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.ACTIVITIES}
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <ActivitiesPage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.SETTINGS}
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <SettingsPage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.INTEGRATIONS}
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <IntegrationsStore />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.TEAM}
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <MembersInvitePage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.CHANGES}
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <PromoteChangesPage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path={ROUTES.SUBSCRIBERS}
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <SubscribersList />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/brand"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <BrandPage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                    </Route>
                  </Routes>
                </SpotLightProvider>
              </ThemeHandlerComponent>
            </AuthHandlerComponent>
          </QueryClientProvider>
        </BrowserRouter>
      </HelmetProvider>
    </SegmentProvider>
  );
}

function jwtHasKey(key: string) {
  const token = getToken();

  if (!token) return false;
  const jwt = decode<IJwtPayload>(token);

  return jwt && jwt[key];
}

function RequiredAuth({ children }: any) {
  useBlueprint();
  const { logout } = useContext(AuthContext);
  const location = useLocation();

  // TODO: remove after env migration
  const payload = getTokenPayload();
  if (payload && (payload as any).applicationId) {
    logout();
    window.location.reload();
  }

  // Logout if token.exp is in the past (expired)
  if (payload && payload.exp && payload.exp <= Date.now() / 1000) {
    logout();

    return null;
  }

  if (!getToken()) {
    return <Navigate to={ROUTES.AUTH_LOGIN} replace />;
  } else if (
    !jwtHasKey('organizationId') ||
    (!jwtHasKey('environmentId') && location.pathname !== ROUTES.AUTH_APPLICATION)
  ) {
    return <Navigate to={ROUTES.AUTH_APPLICATION} replace />;
  } else {
    return children;
  }
}

function ThemeHandlerComponent({ children }: { children: React.ReactNode }) {
  const { setCurrentTheme, currentTheme, toggleTheme } = useThemeController();

  return (
    <ThemeContext.Provider
      value={{
        theme: currentTheme,
        setTheme: setCurrentTheme,
        toggleTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

function AuthHandlerComponent({ children }: { children: React.ReactNode }) {
  const { token, setToken, user, organization, logout, jwtPayload, organizations } = useAuthController();

  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
        currentOrganization: organization,
        organizations,
        token,
        logout,
        setToken,
        jwtPayload,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function SpotLightProvider({ children }) {
  const [items, setItems] = useState<SpotlightItem[]>([]);

  const addItem = (item: SpotlightItem | SpotlightItem[]) => {
    if (!Array.isArray(item)) {
      item = [item];
    }

    const newItems = [...items, ...item];
    newItems.sort((a, b) => (b.order || 0) - (a.order || 0));

    setItems(newItems);
  };

  const removeItem = (id: string) => {
    setItems(items.filter((item) => item.id !== id));
  };

  return <SpotlightContext.Provider value={{ items, addItem, removeItem }}>{children}</SpotlightContext.Provider>;
}

export default Sentry.withProfiler(App);

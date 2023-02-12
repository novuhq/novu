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
import {
  QuickStartDemo,
  QuickStartCards,
  QuickStartHeader,
  ImplementationDescription,
  TroubleshootingDescription,
} from './pages/quick-start/QuickStart';
import { TemplateEditorProvider } from './components/templates/TemplateEditorProvider';
import { TemplateFormProvider } from './components/templates/TemplateFormProvider';
import { SpotLight } from './components/utils/Spotlight';
import { SpotlightContext, SpotlightItem } from './store/spotlightContext';
import { LinkVercelProjectPage } from './pages/partner-integrations/LinkVercelProjectPage';
import { useBlueprint } from './hooks/useBlueprint';
import { BrandPage } from './pages/brand/BrandPage';
import { SegmentProvider } from './store/segment.context';
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';
import { GeneralStarter } from './pages/quick-start/GeneralStarter';
import { BellGradient, MobileGradient } from './design-system/icons';
import { SetUp } from './pages/quick-start/components/SetUp';
import { TestNotificationTrigger } from './pages/quick-start/components/TestNotificationTrigger';
import { welcomeDescription } from './pages/quick-start/consts';
import { NestedSquares } from './design-system/icons/gradient/NestedSquares';
import { Smiley } from './design-system/icons/gradient/Smiley';

if (LOGROCKET_ID && window !== undefined) {
  LogRocket.init(LOGROCKET_ID);
  setupLogRocketReact(LogRocket);
}

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing()],
    environment: ENV,
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
                    <Route path="/auth/signup" element={<SignUpPage />} />
                    <Route path="/auth/login" element={<LoginPage />} />
                    <Route path="/auth/reset/request" element={<PasswordResetPage />} />
                    <Route path="/auth/reset/:token" element={<PasswordResetPage />} />
                    <Route path="/auth/invitation/:token" element={<InvitationPage />} />
                    <Route path="/auth/application" element={<CreateOrganizationPage />} />
                    <Route
                      path="/partner-integrations/vercel/link-projects"
                      element={
                        <RequiredAuth>
                          <LinkVercelProjectPage type="create" />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path="/partner-integrations/vercel/link-projects/edit"
                      element={
                        <RequiredAuth>
                          <LinkVercelProjectPage type="edit" />
                        </RequiredAuth>
                      }
                    />
                    <Route element={<AppLayout />}>
                      <Route
                        path="/*"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <HomePage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/templates/create"
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
                        path="/templates/edit/:templateId"
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
                        path="/templates"
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
                              <QuickStartHeader>
                                <GeneralStarter />
                              </QuickStartHeader>
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <QuickStartHeader
                                title={welcomeDescription}
                                description={'What would you like to build?'}
                              >
                                <QuickStartCards
                                  cells={[
                                    {
                                      navIcon: BellGradient,
                                      description: 'Notification Center',
                                      navigateTo: '/quickstart/notification-center',
                                    },
                                    {
                                      navIcon: NestedSquares,
                                      description: 'Other',
                                      navigateTo: '/general-started',
                                    },
                                  ]}
                                />
                              </QuickStartHeader>
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart/notification-center/set-up"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <QuickStartHeader title={welcomeDescription} description={<ImplementationDescription />}>
                                <QuickStartCards
                                  cells={[
                                    {
                                      imagePath: `/static/images/frameworks/dark/react.png`,
                                      navigateTo: '/quickstart/notification-center/set-up/react',
                                    },
                                    {
                                      imagePath: `/static/images/frameworks/dark/angular.png`,
                                      navigateTo: '/quickstart/notification-center/set-up/angular',
                                    },
                                    {
                                      imagePath: `/static/images/frameworks/dark/vue.png`,
                                      navigateTo: '/quickstart/notification-center/set-up/vue',
                                    },
                                  ]}
                                />
                              </QuickStartHeader>
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart/notification-center/set-up/:framework"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <QuickStartHeader
                                title={'Pending Notification Center Initialization'}
                                description={<TroubleshootingDescription />}
                              >
                                <SetUp />
                              </QuickStartHeader>
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart/notification-center/trigger"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <QuickStartHeader
                                title={'Now is the time to trigger notification'}
                                description={'do it! '}
                              >
                                <TestNotificationTrigger />
                              </QuickStartHeader>
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart/notification-center/demo"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <QuickStartHeader
                                title={'Great Choice!'}
                                description={'Let’s start by a quick setup for the app:'}
                              >
                                <QuickStartDemo />
                              </QuickStartHeader>
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/quickstart/notification-center"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <QuickStartHeader
                                title={welcomeDescription}
                                description={'Where would you like to start?'}
                              >
                                <QuickStartCards
                                  cells={[
                                    {
                                      navIcon: MobileGradient,
                                      description: 'I have an app let’s add the to my app',
                                      navigateTo: '/quickstart/notification-center/set-up',
                                    },
                                    {
                                      navIcon: Smiley,
                                      description: 'Let’s just play around with a demo app',
                                      navigateTo: '/quickstart/notification-center/demo',
                                    },
                                  ]}
                                />
                              </QuickStartHeader>
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/activities"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <ActivitiesPage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/settings"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <SettingsPage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/integrations"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <IntegrationsStore />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/team"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <MembersInvitePage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/changes"
                        element={
                          <RequiredAuth>
                            <SpotLight>
                              <PromoteChangesPage />
                            </SpotLight>
                          </RequiredAuth>
                        }
                      />
                      <Route
                        path="/subscribers"
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
    return <Navigate to="/auth/login" replace />;
  } else if (
    !jwtHasKey('organizationId') ||
    (!jwtHasKey('environmentId') && location.pathname !== '/auth/application')
  ) {
    return <Navigate to="/auth/application" replace />;
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

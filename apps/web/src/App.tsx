import React, { useContext, useState } from 'react';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Route, Routes, Navigate, BrowserRouter, useLocation } from 'react-router-dom';
import { Integrations } from '@sentry/tracing';
import decode from 'jwt-decode';
import { IJwtPayload } from '@novu/shared';
import { AuthContext } from './store/authContext';
import { applyToken, getToken, getTokenPayload, useAuthController } from './store/use-auth-controller';
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
import { useThemeController } from './store/use-theme-controller';
import { AppLayout } from './components/layout/AppLayout';
import { MembersInvitePage } from './pages/invites/MembersInvitePage';
import { IntegrationsStore } from './pages/integrations/IntegrationsStorePage';
import CreateOrganizationPage from './pages/auth/CreateOrganizationPage';
import { ENV, SENTRY_DSN, CONTEXT_PATH } from './config';
import { PromoteChangesPage } from './pages/changes/PromoteChangesPage';
import QuickStartPage from './pages/quick-start/QuickStartPage';
import { TemplateEditorProvider } from './components/templates/TemplateEditorProvider';
import { TemplateFormProvider } from './components/templates/TemplateFormProvider';
import { SpotLight } from './components/utils/Spotlight';
import { SpotlightContext, SpotlightItem } from './store/spotlightContext';
import { LinkVercelProjectPage } from './pages/partner-integrations/LinkVercelProjectPage';

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
                      path="/quickstart"
                      element={
                        <RequiredAuth>
                          <SpotLight>
                            <QuickStartPage />
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
                  </Route>
                </Routes>
              </SpotLightProvider>
            </ThemeHandlerComponent>
          </AuthHandlerComponent>
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

function jwtHasKey(key: string) {
  const token = getToken();

  if (!token) return false;
  const jwt = decode<IJwtPayload>(token);

  return jwt && jwt[key];
}

function RequiredAuth({ children }: any) {
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

import React, { useContext } from 'react';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Route, Routes, Navigate, BrowserRouter } from 'react-router-dom';
import { Integrations } from '@sentry/tracing';
import { AuthContext } from './store/authContext';
import { applyToken, getToken, getTokenPayload, useAuthController } from './store/use-auth-controller';
import { ActivitiesPage } from './pages/activities/ActivitiesPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import HomePage from './pages/HomePage';
import TemplateEditorPage from './pages/templates/editor/TemplateEditorPage';
import NotificationList from './pages/templates/TemplatesListPage';
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
import { ENV, SENTRY_DSN } from './config/index';
import { useEnvController } from './store/use-env-controller';
import { EnvContext } from './store/environmentContext';
import { PromoteChangesPage } from './pages/changes/PromoteChangesPage';

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
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <AuthHandlerComponent>
            <ThemeHandlerComponent>
              <EnvHandlerComponent>
                <Routes>
                  <Route path="/auth/signup" element={<SignUpPage />} />
                  <Route path="/auth/login" element={<LoginPage />} />
                  <Route path="/auth/reset/request" element={<PasswordResetPage />} />
                  <Route path="/auth/reset/:token" element={<PasswordResetPage />} />
                  <Route path="/auth/invitation/:token" element={<InvitationPage />} />
                  <Route path="/auth/application" element={<CreateOrganizationPage />} />
                  <Route element={<AppLayout />}>
                    <Route
                      path="/*"
                      element={
                        <RequiredAuth>
                          <HomePage />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path="/templates/create"
                      element={
                        <RequiredAuth>
                          <TemplateEditorPage />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path="/templates/edit/:templateId"
                      element={
                        <RequiredAuth>
                          <TemplateEditorPage />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path="/templates"
                      element={
                        <RequiredAuth>
                          <NotificationList />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path="/activities"
                      element={
                        <RequiredAuth>
                          <ActivitiesPage />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path="/settings"
                      element={
                        <RequiredAuth>
                          <SettingsPage />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path="/integrations"
                      element={
                        <RequiredAuth>
                          <IntegrationsStore />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path="/team"
                      element={
                        <RequiredAuth>
                          <MembersInvitePage />
                        </RequiredAuth>
                      }
                    />
                    <Route
                      path="/changes"
                      element={
                        <RequiredAuth>
                          <PromoteChangesPage />
                        </RequiredAuth>
                      }
                    />
                  </Route>
                </Routes>
              </EnvHandlerComponent>
            </ThemeHandlerComponent>
          </AuthHandlerComponent>
        </QueryClientProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}

function RequiredAuth({ children }: any) {
  const { logout } = useContext(AuthContext);

  // TODO: remove after env migration
  const payload = getTokenPayload();
  if (payload && (payload as any).applicationId) {
    logout();
    window.location.reload();
  }

  return getToken() ? children : <Navigate to="/auth/login" replace />;
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
  const { token, setToken, user, organization, logout, jwtPayload } = useAuthController();

  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
        currentOrganization: organization,
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

function EnvHandlerComponent({ children }: { children: React.ReactNode }) {
  const { environment, readonly, setEnvironment } = useEnvController();

  return (
    <EnvContext.Provider
      value={{
        currentEnvironment: environment,
        readonly,
        setEnvironment,
      }}
    >
      {children}
    </EnvContext.Provider>
  );
}

export default Sentry.withProfiler(App);

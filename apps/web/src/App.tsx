import React from 'react';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Route, Routes, Navigate, BrowserRouter } from 'react-router-dom';
import { Integrations } from '@sentry/tracing';
import { AuthContext } from './store/authContext';
import { applyToken, getToken, useAuthController } from './store/use-auth-controller';
import { ActivitiesPage } from './legacy/pages/activities/ActivitiesPage';
import LoginPage from './pages/auth/LoginPage';
import SignUpPage from './pages/auth/SignUpPage';
import HomePage from './legacy/pages/HomePage';
import ApplicationOnBoarding from './legacy/pages/onboarding/application';
import TemplateEditorPage from './pages/templates/editor/TemplateEditorPage';
import NotificationList from './pages/templates/TemplatesListPage';
import { WidgetSettingsPage } from './pages/settings/WidgetSettingsPage';
import { OrganizationSettingsPage } from './legacy/pages/organization-settings/OrganizationSettingsPage';
import InvitationScreen from './legacy/pages/auth/InvitationScreen';
import { api } from './api/api.client';
import PasswordResetPage from './legacy/pages/auth/password-reset';
import { ThemeContext } from './store/themeContext';
import { useThemeController } from './store/use-theme-controller';
import { AppLayout } from './components/layout/AppLayout';
import { IntegrationsStore } from './pages/integrations/IntegrationsStorePage';

if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing()],
    environment: process.env.REACT_APP_ENVIRONMENT,
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
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthHandlerComponent>
          <ThemeHandlerComponent>
            <Routes>
              <Route path="/auth/signup" element={<SignUpPage />} />
              <Route path="/auth/login" element={<LoginPage />} />
              <Route path="/auth/reset/request" element={<PasswordResetPage />} />
              <Route path="/auth/reset/:token" element={<PasswordResetPage />} />
              <Route path="/auth/invitation/:token" element={<InvitationScreen />} />
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
                  path="/onboarding/application"
                  element={
                    <RequiredAuth>
                      <ApplicationOnBoarding />
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
                  path="/settings/widget"
                  element={
                    <RequiredAuth>
                      <WidgetSettingsPage />
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
                  path="/settings/organization"
                  element={
                    <RequiredAuth>
                      <OrganizationSettingsPage />
                    </RequiredAuth>
                  }
                />
              </Route>
            </Routes>
          </ThemeHandlerComponent>
        </AuthHandlerComponent>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

function RequiredAuth({ children }: any) {
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
      }}>
      {children}
    </ThemeContext.Provider>
  );
}

function AuthHandlerComponent({ children }: { children: React.ReactNode }) {
  const { token, setToken, user, logout } = useAuthController();

  return (
    <AuthContext.Provider
      value={{
        currentUser: user,
        token,
        logout,
        setToken,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export default Sentry.withProfiler(App);

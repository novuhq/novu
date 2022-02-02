import React from 'react';
import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Route, Switch, Redirect, BrowserRouter } from 'react-router-dom';
import { Integrations } from '@sentry/tracing';
import { AuthContext } from './store/authContext';
import { applyToken, getToken, useAuthController } from './store/use-auth-controller';
import { ActivitiesPage } from './legacy/pages/activities/ActivitiesPage';
import LoginPage from './legacy/pages/auth/login';
import SignUpPage from './legacy/pages/auth/signup';
import HomePage from './legacy/pages/HomePage';
import ApplicationOnBoarding from './legacy/pages/onboarding/application';
import TemplateEditorPage from './legacy/pages/templates/editor/TemplateEditorPage';
import NotificationList from './legacy/pages/templates/TemplatesListPage';
import { WidgetSettingsPage } from './legacy/pages/settings/WidgetSettingsPage';
import { OrganizationSettingsPage } from './legacy/pages/organization-settings/OrganizationSettingsPage';
import InvitationScreen from './legacy/pages/auth/InvitationScreen';
import { api } from './api/api.client';
import PasswordResetPage from './legacy/pages/auth/password-reset';
import { ThemeContext } from './store/themeContext';
import { useThemeController } from './store/use-theme-controller';
import { AppLayout } from './components/layout/AppLayout';

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
            <Switch>
              <Route path="/auth/signup">
                <SignUpPage />
              </Route>
              <Route path="/auth/login">
                <LoginPage />
              </Route>
              <Route path="/auth/reset/request">
                <PasswordResetPage />
              </Route>
              <Route path="/auth/reset/:token">
                <PasswordResetPage />
              </Route>
              <Route path="/auth/invitation/:token">
                <InvitationScreen />
              </Route>
              <Route path="/">
                <PrivateRoute>
                  <Switch>
                    <Route exact path="/onboarding/application">
                      <ApplicationOnBoarding />
                    </Route>
                    <AppLayout>
                      <Route exact path="/">
                        <HomePage />
                      </Route>
                      <Route exact path="/templates/create">
                        <TemplateEditorPage />
                      </Route>
                      <Route exact path="/templates/edit/:templateId">
                        <TemplateEditorPage />
                      </Route>
                      <Route exact path="/templates">
                        <NotificationList />
                      </Route>
                      <Route exact path="/activities">
                        <ActivitiesPage />
                      </Route>
                      <Route exact path="/settings/widget">
                        <WidgetSettingsPage />
                      </Route>
                      <Route exact path="/settings/organization">
                        <OrganizationSettingsPage />
                      </Route>
                    </AppLayout>
                  </Switch>
                </PrivateRoute>
              </Route>
            </Switch>
          </ThemeHandlerComponent>
        </AuthHandlerComponent>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

function PrivateRoute({ children, ...rest }: any) {
  return (
    <Route
      {...rest}
      render={({ location }) => {
        return getToken() ? (
          children
        ) : (
          <Redirect
            to={{
              pathname: '/auth/login',
              state: { from: location },
            }}
          />
        );
      }}
    />
  );
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

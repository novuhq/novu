import * as Sentry from '@sentry/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { Route, Routes, BrowserRouter } from 'react-router-dom';
import LogRocket from 'logrocket';
import setupLogRocketReact from 'logrocket-react';
import { Integrations } from '@sentry/tracing';

import packageJson from '../package.json';
import { AuthProvider } from './components/providers/AuthProvider';
import { applyToken, getToken } from './hooks';
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
import { AppLayout } from './components/layout/AppLayout';
import { MembersInvitePage } from './pages/invites/MembersInvitePage';
import { IntegrationsStore } from './pages/integrations/IntegrationsStorePage';
import CreateOrganizationPage from './pages/auth/CreateOrganizationPage';
import { ENV, SENTRY_DSN, CONTEXT_PATH, LOGROCKET_ID } from './config';
import { PromoteChangesPage } from './pages/changes/PromoteChangesPage';
import { LinkVercelProjectPage } from './pages/partner-integrations/LinkVercelProjectPage';
import { ROUTES } from './constants/routes.enum';
import { BrandPage } from './pages/brand/BrandPage';
import { SegmentProvider } from './components/providers/SegmentProvider';
import { NotificationCenter } from './pages/quick-start/steps/NotificationCenter';
import { FrameworkSetup } from './pages/quick-start/steps/FrameworkSetup';
import { Setup } from './pages/quick-start/steps/Setup';
import { Trigger } from './pages/quick-start/steps/Trigger';
import { RequiredAuth } from './components/layout/RequiredAuth';
import { GetStarted } from './pages/quick-start/steps/GetStarted';
import { DigestPreview } from './pages/quick-start/steps/DigestPreview';
import { TemplatesDigestPlaygroundPage } from './pages/templates/TemplatesDigestPlaygroundPage';
import { Sidebar } from './pages/templates/workflow/SideBar/Sidebar';
import { TemplateSettings } from './pages/templates/components/TemplateSettings';
import { UserPreference } from './pages/templates/components/UserPreference';
import { TestWorkflowPage } from './pages/templates/components/TestWorkflowPage';
import { SnippetPage } from './pages/templates/components/SnippetPage';
import { TemplateEditor } from './pages/templates/components/TemplateEditor';
import { ProvidersPage } from './pages/templates/components/ProvidersPage';

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
            <AuthProvider>
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
                  <Route path={ROUTES.ANY} element={<HomePage />} />
                  <Route path={ROUTES.TEMPLATES_DIGEST_PLAYGROUND} element={<TemplatesDigestPlaygroundPage />} />
                  <Route path={ROUTES.TEMPLATES_CREATE} element={<TemplateEditorPage />} />
                  <Route path={ROUTES.TEMPLATES_EDIT_TEMPLATEID} element={<TemplateEditorPage />}>
                    <Route path="" element={<Sidebar />} />
                    <Route path="settings" element={<TemplateSettings />} />
                    <Route path="channels" element={<UserPreference />} />
                    <Route path="test-workflow" element={<TestWorkflowPage />} />
                    <Route path="snippet" element={<SnippetPage />} />
                    <Route path="providers" element={<ProvidersPage />} />
                    <Route path=":channel/:stepUuid" element={<TemplateEditor />} />
                  </Route>
                  <Route path={ROUTES.TEMPLATES} element={<NotificationList />} />
                  <Route path={ROUTES.GET_STARTED} element={<GetStarted />} />
                  <Route path={ROUTES.GET_STARTED_PREVIEW} element={<DigestPreview />} />
                  <Route path={ROUTES.QUICK_START_NOTIFICATION_CENTER} element={<NotificationCenter />} />
                  <Route path={ROUTES.QUICK_START_SETUP} element={<FrameworkSetup />} />
                  <Route path={ROUTES.QUICK_START_SETUP_FRAMEWORK} element={<Setup />} />
                  <Route path={ROUTES.QUICK_START_SETUP_TRIGGER} element={<Trigger />} />
                  <Route path={ROUTES.ACTIVITIES} element={<ActivitiesPage />} />
                  <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
                  <Route path={ROUTES.INTEGRATIONS} element={<IntegrationsStore />} />
                  <Route path={ROUTES.TEAM} element={<MembersInvitePage />} />
                  <Route path={ROUTES.CHANGES} element={<PromoteChangesPage />} />
                  <Route path={ROUTES.SUBSCRIBERS} element={<SubscribersList />} />
                  <Route path="/brand" element={<BrandPage />} />
                </Route>
              </Routes>
            </AuthProvider>
          </QueryClientProvider>
        </BrowserRouter>
      </HelmetProvider>
    </SegmentProvider>
  );
}

export default Sentry.withProfiler(App);

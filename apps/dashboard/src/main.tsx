import '@maily-to/core/style.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import './index.css';
import { Navigate } from 'react-router-dom';

import { ConfigureWorkflow } from '@/components/workflow-editor/configure-workflow';
import { EditStepConditions } from '@/components/workflow-editor/steps/conditions/edit-step-conditions';
import { ConfigureStep } from '@/components/workflow-editor/steps/configure-step';
import { ConfigureStepTemplate } from '@/components/workflow-editor/steps/configure-step-template';
import {
  ActivityFeed,
  ApiKeysPage,
  CreateWorkflowPage,
  ErrorPage,
  IntegrationsListPage,
  OrganizationListPage,
  QuestionnairePage,
  SettingsPage,
  SignInPage,
  SignUpPage,
  TemplateModal,
  UsecaseSelectPage,
  WelcomePage,
  WorkflowsPage,
} from '@/pages';
import { DuplicateWorkflowPage } from '@/pages/duplicate-workflow';
import { SubscribersPage } from '@/pages/subscribers';
import { WebhooksPage } from '@/pages/webhooks-page';
import { CreateIntegrationSidebar } from './components/integrations/components/create-integration-sidebar';
import { UpdateIntegrationSidebar } from './components/integrations/components/update-integration-sidebar';
import { ChannelPreferences } from './components/workflow-editor/channel-preferences';
import { FeatureFlagsProvider } from './context/feature-flags-provider';
import { CreateSubscriberPage } from './pages/create-subscriber';
import { CreateTopicPage } from './pages/create-topic';
import { EditSubscriberPage } from './pages/edit-subscriber-page';
import { EditTopicPage } from './pages/edit-topic';
import { EditWorkflowPage } from './pages/edit-workflow';
import { EnvironmentsPage } from './pages/environments';
import { InboxEmbedPage } from './pages/inbox-embed-page';
import { InboxEmbedSuccessPage } from './pages/inbox-embed-success-page';
import { InboxUsecasePage } from './pages/inbox-usecase-page';
import { RedirectToLegacyStudioAuth } from './pages/redirect-to-legacy-studio-auth';
import { TestWorkflowPage } from './pages/test-workflow';
import { TopicsPage } from './pages/topics';
import { VercelIntegrationPage } from './pages/vercel-integration-page';
import { AuthRoute, CatchAllRoute, DashboardRoute, RootRoute } from './routes';
import { OnboardingParentRoute } from './routes/onboarding';
import { ROUTES } from './utils/routes';
import { initializeSentry } from './utils/sentry';
import { overrideZodErrorMap } from './utils/validation';
import { IS_SELF_HOSTED } from './config';

initializeSentry();
overrideZodErrorMap();

const router = createBrowserRouter([
  {
    element: <RootRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        element: <AuthRoute />,
        children: [
          {
            path: `${ROUTES.SIGN_IN}/*`,
            element: <SignInPage />,
          },
          {
            path: `${ROUTES.SIGN_UP}/*`,
            element: <SignUpPage />,
          },
          {
            path: ROUTES.SIGNUP_ORGANIZATION_LIST,
            element: <OrganizationListPage />,
          },
        ],
      },
      {
        path: '/onboarding',
        element: <OnboardingParentRoute />,
        children: [
          {
            path: ROUTES.SIGNUP_QUESTIONNAIRE,
            element: <QuestionnairePage />,
          },
          {
            path: ROUTES.USECASE_SELECT,
            element: <UsecaseSelectPage />,
          },
          {
            path: ROUTES.INBOX_USECASE,
            element: <InboxUsecasePage />,
          },
          {
            path: ROUTES.INBOX_EMBED,
            element: <InboxEmbedPage />,
          },
          {
            path: ROUTES.INBOX_EMBED_SUCCESS,
            element: <InboxEmbedSuccessPage />,
          },
        ],
      },
      {
        path: ROUTES.ROOT,
        element: <DashboardRoute />,
        children: [
          /* Direct routes matching environment-specific paths (e.g., /topics -> /env/:envId/topics) 
             will be automatically redirected by the CatchAllRoute component */
          {
            path: ROUTES.ENV,
            children: [
              {
                path: ROUTES.WELCOME,
                element: <WelcomePage />,
              },
              {
                path: ROUTES.WORKFLOWS,
                element: <WorkflowsPage />,
                children: [
                  {
                    path: ROUTES.TEMPLATE_STORE,
                    element: <TemplateModal />,
                  },
                  {
                    path: ROUTES.TEMPLATE_STORE_CREATE_WORKFLOW,
                    element: <TemplateModal />,
                  },
                  {
                    path: ROUTES.WORKFLOWS_CREATE,
                    element: <CreateWorkflowPage />,
                  },
                  {
                    path: ROUTES.WORKFLOWS_DUPLICATE,
                    element: <DuplicateWorkflowPage />,
                  },
                ],
              },
              {
                path: ROUTES.SUBSCRIBERS,
                element: <SubscribersPage />,
                children: [
                  {
                    path: ROUTES.EDIT_SUBSCRIBER,
                    element: <EditSubscriberPage />,
                  },
                  {
                    path: ROUTES.CREATE_SUBSCRIBER,
                    element: <CreateSubscriberPage />,
                  },
                ],
              },
              {
                path: ROUTES.TOPICS,
                element: <TopicsPage />,
                children: [
                  {
                    path: ROUTES.TOPICS_CREATE,
                    element: <CreateTopicPage />,
                  },
                  {
                    path: ROUTES.TOPICS_EDIT,
                    element: <EditTopicPage />,
                  },
                ],
              },
              {
                path: ROUTES.API_KEYS,
                element: <ApiKeysPage />,
              },
              {
                path: ROUTES.ENVIRONMENTS,
                element: <EnvironmentsPage />,
              },
              {
                path: ROUTES.ACTIVITY_FEED,
                element: <ActivityFeed />,
              },
              {
                path: ROUTES.EDIT_WORKFLOW,
                element: <EditWorkflowPage />,
                children: [
                  {
                    element: <ConfigureWorkflow />,
                    index: true,
                  },
                  {
                    element: <ConfigureStep />,
                    path: ROUTES.EDIT_STEP,
                  },
                  {
                    element: <ConfigureStepTemplate />,
                    path: ROUTES.EDIT_STEP_TEMPLATE,
                  },
                  {
                    element: <EditStepConditions />,
                    path: ROUTES.EDIT_STEP_CONDITIONS,
                  },
                  {
                    element: <ChannelPreferences />,
                    path: ROUTES.EDIT_WORKFLOW_PREFERENCES,
                  },
                ],
              },
              {
                path: ROUTES.TEST_WORKFLOW,
                element: <TestWorkflowPage />,
              },
              {
                path: ROUTES.WEBHOOKS_ENDPOINTS,
                element: <WebhooksPage />,
              },
              {
                path: ROUTES.WEBHOOKS_EVENT_CATALOG,
                element: <WebhooksPage />,
              },
              {
                path: ROUTES.WEBHOOKS_LOGS,
                element: <WebhooksPage />,
              },
              {
                path: ROUTES.WEBHOOKS_ACTIVITY,
                element: <WebhooksPage />,
              },
              {
                path: ROUTES.WEBHOOKS,
                element: <Navigate to={ROUTES.WEBHOOKS_ENDPOINTS} replace />,
              },
              {
                path: '*',
                element: <CatchAllRoute />,
              },
            ],
          },
          {
            path: ROUTES.INTEGRATIONS,
            element: <IntegrationsListPage />,
            children: [
              {
                path: ROUTES.INTEGRATIONS_CONNECT,
                element: <CreateIntegrationSidebar isOpened />,
              },
              {
                path: ROUTES.INTEGRATIONS_CONNECT_PROVIDER,
                element: <CreateIntegrationSidebar isOpened />,
              },
              {
                path: ROUTES.INTEGRATIONS_UPDATE,
                element: <UpdateIntegrationSidebar isOpened />,
              },
            ],
          },
          {
            path: ROUTES.INTEGRATIONS,
            element: <IntegrationsListPage />,
          },
          {
            path: ROUTES.PARTNER_INTEGRATIONS_VERCEL,
            element: <VercelIntegrationPage />,
          },
          {
            path: ROUTES.SETTINGS,
            element: IS_SELF_HOSTED ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_ACCOUNT,
            element: IS_SELF_HOSTED ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_ORGANIZATION,
            element: IS_SELF_HOSTED ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_TEAM,
            element: IS_SELF_HOSTED ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_BILLING,
            element: IS_SELF_HOSTED ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
          },
          {
            path: ROUTES.LOCAL_STUDIO_AUTH,
            element: <RedirectToLegacyStudioAuth />,
          },
          {
            path: '*',
            element: <CatchAllRoute />,
          },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FeatureFlagsProvider>
      <RouterProvider router={router} />
    </FeatureFlagsProvider>
  </StrictMode>
);

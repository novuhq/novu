import '@novu/maily-core/style.css';
import { PermissionsEnum } from '@novu/shared';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import './index.css';

import { ConfigureWorkflow } from '@/components/workflow-editor/configure-workflow';
import { EditStepConditions } from '@/components/workflow-editor/steps/conditions/edit-step-conditions';
import { ConfigureStep } from '@/components/workflow-editor/steps/configure-step';

import {
  ActivityFeed,
  AnalyticsPage,
  ApiKeysPage,
  CreateLayoutPage,
  CreateWorkflowPage,
  ErrorPage,
  IntegrationsListPage,
  InvitationAcceptPage,
  LayoutsPage,
  OrganizationListPage,
  SettingsPage,
  SignInPage,
  SignUpPage,
  SSOSignInPage,
  TemplateModal,
  TranslationsPage,
  VerifyEmailPage,
  WelcomePage,
  WorkflowsPage,
} from '@/pages';
import {
  ConnectApiKeysPage,
  ConnectConversationsPage,
  ConnectDashboardPage,
  ConnectSettingsPage,
} from '@/pages/connect';
import { DuplicateWorkflowPage } from '@/pages/duplicate-workflow';
import { EditStepTemplateV2Page } from '@/pages/edit-step-template-v2';
import { Landing1SignUpPage } from '@/pages/landing-1-signup';
import { SubscribersPage } from '@/pages/subscribers';
import { TranslationSettingsPage } from '@/pages/translation-settings-page';
import { WebhooksPage } from '@/pages/webhooks-page';
import { ConnectSubscriberProvider } from './components/connect/connect-subscriber-provider';
import { CreateIntegrationSidebar } from './components/integrations/components/create-integration-sidebar';
import { UpdateIntegrationSidebar } from './components/integrations/components/update-integration-sidebar';
import { ChannelPreferences } from './components/workflow-editor/channel-preferences';
import { IS_ENTERPRISE, IS_SELF_HOSTED } from './config';
import { FeatureFlagsProvider } from './context/feature-flags-provider';
import { AgentDetailsPage } from './pages/agent-details';
import { AgentTelegramMobileSetupPage } from './pages/agent-telegram-mobile-setup-page';
import { AgentsPage } from './pages/agents';
import { AgentsSetupPage } from './pages/agents-setup-page';
import { CliAuthPage } from './pages/cli-auth';
import { ContextsPage } from './pages/contexts';
import { CreateContextPage } from './pages/create-context';
import { CreateSubscriberPage } from './pages/create-subscriber';
import { CreateTopicPage } from './pages/create-topic';
import { DomainDetailPage } from './pages/domain-detail';
import { DomainsPage } from './pages/domains';
import { DuplicateLayoutPage } from './pages/duplicate-layout-page';
import { EditContextPage } from './pages/edit-context';
import { EditLayoutPage } from './pages/edit-layout';
import { EditSubscriberPage } from './pages/edit-subscriber-page';
import { EditTopicPage } from './pages/edit-topic';
import { EditTranslationPage } from './pages/edit-translation';
import { EditWorkflowPage } from './pages/edit-workflow';
import { EnvironmentsPage } from './pages/environments';
import { ForgotPasswordPage } from './pages/forgot-password';
import { InboxEmbedPage } from './pages/inbox-embed-page';
import { InboxEmbedSuccessPage } from './pages/inbox-embed-success-page';
import { InboxUsecasePage } from './pages/inbox-usecase-page';
import { IntegrationStoreTelegramMobileSetupPage } from './pages/integration-store-telegram-mobile-setup-page';
import { RedirectToLegacyStudioAuth } from './pages/redirect-to-legacy-studio-auth';
import { ResetPasswordPage } from './pages/reset-password';
import { TestWorkflowDrawerPage } from './pages/test-workflow-drawer-page';
import { TestWorkflowRouteHandler } from './pages/test-workflow-route-handler';
import { TopicsPage } from './pages/topics';
import { UpsertVariablePage } from './pages/upsert-variable';
import { UsecaseSelectPage } from './pages/usecase-select-page';
import { VariablesPage } from './pages/variables';
import { VercelIntegrationPage } from './pages/vercel-integration-page';
import { AuthRoute, CatchAllRoute, DashboardRoute, ProtectedAuthRoute, RootRoute } from './routes';
import { ConnectProtectedRoute } from './routes/connect-protected-route';
import { OnboardingParentRoute } from './routes/onboarding';
import { ProtectedRoute } from './routes/protected-route';
import { captureAgentTemplateIdFromUrl } from './utils/agent-template-identity';
import { ROUTES } from './utils/routes';
import { initializeSentry } from './utils/sentry';
import { overrideZodErrorMap } from './utils/validation';

initializeSentry();
overrideZodErrorMap();
// Stash an incoming `?agentTemplateId=` before Clerk's auth redirects drop the query params.
captureAgentTemplateIdFromUrl();

const router = createBrowserRouter([
  {
    element: <RootRoute />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: `${ROUTES.LANDING_1_SIGN_UP}/*`,
        element: <Landing1SignUpPage />,
      },
      {
        path: ROUTES.CLI_AUTH,
        element: <CliAuthPage />,
      },
      {
        // Public, unauthenticated mobile setup page for Telegram. Mounted outside
        // AuthRoute so unauthenticated visitors are not redirected to sign-in.
        path: ROUTES.AGENT_TELEGRAM_MOBILE_SETUP,
        element: <AgentTelegramMobileSetupPage />,
      },
      {
        // Public, unauthenticated mobile setup page for the Telegram integration
        // store create flow. Creates a new integration server-side on submit.
        path: ROUTES.INTEGRATION_TELEGRAM_MOBILE_SETUP,
        element: <IntegrationStoreTelegramMobileSetupPage />,
      },
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
            path: ROUTES.FORGOT_PASSWORD,
            element: <ForgotPasswordPage />,
          },
          {
            path: ROUTES.RESET_PASSWORD,
            element: <ResetPasswordPage />,
          },
          {
            path: ROUTES.SSO_SIGN_IN,
            element: <SSOSignInPage />,
          },
          {
            path: ROUTES.VERIFY_EMAIL,
            element: <VerifyEmailPage />,
          },
        ],
      },
      {
        element: <ProtectedAuthRoute />,
        children: [
          {
            path: ROUTES.SIGNUP_ORGANIZATION_LIST,
            element: <OrganizationListPage />,
          },
          {
            path: ROUTES.INVITATION_ACCEPT,
            element: <InvitationAcceptPage />,
          },
        ],
      },
      {
        path: '/onboarding',
        element: <OnboardingParentRoute />,
        children: [
          {
            path: ROUTES.USECASE_SELECT,
            element: <UsecaseSelectPage />,
          },
          {
            path: ROUTES.AGENTS_SETUP,
            element: (
              <ConnectSubscriberProvider>
                <AgentsSetupPage />
              </ConnectSubscriberProvider>
            ),
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
            index: true,
            element: <CatchAllRoute />,
          },
          {
            path: ROUTES.ENV,
            children: [
              {
                path: ROUTES.WELCOME,
                element: <WelcomePage />,
              },
              {
                path: ROUTES.WORKFLOWS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                    <WorkflowsPage />
                  </ProtectedRoute>
                ),
                children: [
                  {
                    path: ROUTES.TEMPLATE_STORE,
                    element: <TemplateModal />,
                  },
                  {
                    path: ROUTES.TEMPLATE_STORE_CREATE_WORKFLOW,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_WRITE} isDrawerRoute>
                        <TemplateModal />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.WORKFLOWS_CREATE,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_WRITE} isDrawerRoute>
                        <CreateWorkflowPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.WORKFLOWS_DUPLICATE,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_WRITE} isDrawerRoute>
                        <DuplicateWorkflowPage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
              {
                path: ROUTES.SUBSCRIBERS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.SUBSCRIBER_READ}>
                    <SubscribersPage />
                  </ProtectedRoute>
                ),
                children: [
                  {
                    path: ROUTES.EDIT_SUBSCRIBER,
                    element: (
                      <ProtectedRoute
                        condition={(has) =>
                          has({ permission: PermissionsEnum.SUBSCRIBER_WRITE }) ||
                          has({ permission: PermissionsEnum.SUBSCRIBER_READ })
                        }
                        isDrawerRoute
                      >
                        <EditSubscriberPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.CREATE_SUBSCRIBER,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.SUBSCRIBER_WRITE} isDrawerRoute>
                        <CreateSubscriberPage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
              {
                path: ROUTES.TOPICS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.TOPIC_READ}>
                    <TopicsPage />
                  </ProtectedRoute>
                ),
                children: [
                  {
                    path: ROUTES.TOPICS_CREATE,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.TOPIC_WRITE} isDrawerRoute>
                        <CreateTopicPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.TOPICS_EDIT,
                    element: (
                      <ProtectedRoute
                        condition={(has) =>
                          has({ permission: PermissionsEnum.TOPIC_WRITE }) ||
                          has({ permission: PermissionsEnum.TOPIC_READ })
                        }
                        isDrawerRoute
                      >
                        <EditTopicPage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
              {
                path: ROUTES.CONTEXTS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                    <ContextsPage />
                  </ProtectedRoute>
                ),
                children: [
                  {
                    path: ROUTES.CONTEXTS_CREATE,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_WRITE} isDrawerRoute>
                        <CreateContextPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.CONTEXTS_EDIT,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ} isDrawerRoute>
                        <EditContextPage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
              {
                path: ROUTES.LAYOUTS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                    <LayoutsPage />
                  </ProtectedRoute>
                ),
                children: [
                  {
                    path: ROUTES.LAYOUTS_CREATE,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_WRITE} isDrawerRoute>
                        <CreateLayoutPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.LAYOUTS_DUPLICATE,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_WRITE} isDrawerRoute>
                        <DuplicateLayoutPage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
              {
                path: ROUTES.LAYOUTS_EDIT,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                    <EditLayoutPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.TRANSLATIONS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                    <TranslationsPage />
                  </ProtectedRoute>
                ),
                children: [
                  {
                    path: ROUTES.TRANSLATION_SETTINGS,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                        <TranslationSettingsPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.TRANSLATIONS_EDIT,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                        <EditTranslationPage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
              {
                element: <ConnectSubscriberProvider />,
                children: [
                  {
                    path: ROUTES.AGENTS,
                    element: <AgentsPage />,
                  },
                  {
                    path: ROUTES.AGENT_DETAILS_INTEGRATIONS_DETAIL,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.AGENT_READ}>
                        <AgentDetailsPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.AGENT_DETAILS_TAB,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.AGENT_READ}>
                        <AgentDetailsPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.AGENT_DETAILS,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.AGENT_READ}>
                        <AgentDetailsPage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
              {
                path: ROUTES.DOMAINS,
                element: !IS_SELF_HOSTED || IS_ENTERPRISE ? <DomainsPage /> : <Navigate to={ROUTES.ROOT} replace />,
              },
              {
                path: ROUTES.DOMAIN_DETAIL,
                element:
                  !IS_SELF_HOSTED || IS_ENTERPRISE ? <DomainDetailPage /> : <Navigate to={ROUTES.ROOT} replace />,
              },
              {
                path: ROUTES.API_KEYS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.API_KEY_READ}>
                    <ApiKeysPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.ENVIRONMENTS,
                element: <EnvironmentsPage />,
              },
              {
                path: ROUTES.VARIABLES,
                element: <VariablesPage />,
                children: [
                  {
                    path: ROUTES.VARIABLES_CREATE,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.ORG_SETTINGS_WRITE} isDrawerRoute>
                        <UpsertVariablePage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
              {
                path: ROUTES.ACTIVITY_FEED,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.NOTIFICATION_READ}>
                    <ActivityFeed />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.ACTIVITY_WORKFLOW_RUNS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.NOTIFICATION_READ}>
                    <ActivityFeed />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.ACTIVITY_REQUESTS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.NOTIFICATION_READ}>
                    <ActivityFeed />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.ACTIVITY_CONVERSATIONS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.NOTIFICATION_READ}>
                    <ActivityFeed />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.ANALYTICS,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.NOTIFICATION_READ}>
                    <AnalyticsPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.EDIT_WORKFLOW,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                    <EditWorkflowPage />
                  </ProtectedRoute>
                ),
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
                    element: <EditStepTemplateV2Page />,
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
                  {
                    path: ROUTES.TRIGGER_WORKFLOW,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.EVENT_WRITE} isDrawerRoute>
                        <TestWorkflowDrawerPage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
              {
                path: ROUTES.EDIT_WORKFLOW_ACTIVITY,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                    <EditWorkflowPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.TEST_WORKFLOW,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.EVENT_WRITE}>
                    <TestWorkflowRouteHandler />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.WEBHOOKS_ENDPOINTS,
                element: (
                  <ProtectedRoute
                    condition={(has) =>
                      has({ permission: PermissionsEnum.WEBHOOK_READ }) ||
                      has({ permission: PermissionsEnum.WEBHOOK_WRITE })
                    }
                  >
                    <WebhooksPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.WEBHOOKS_EVENT_CATALOG,
                element: (
                  <ProtectedRoute
                    condition={(has) =>
                      has({ permission: PermissionsEnum.WEBHOOK_READ }) ||
                      has({ permission: PermissionsEnum.WEBHOOK_WRITE })
                    }
                  >
                    <WebhooksPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.WEBHOOKS_LOGS,
                element: (
                  <ProtectedRoute
                    condition={(has) =>
                      has({ permission: PermissionsEnum.WEBHOOK_READ }) ||
                      has({ permission: PermissionsEnum.WEBHOOK_WRITE })
                    }
                  >
                    <WebhooksPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.WEBHOOKS_ACTIVITY,
                element: (
                  <ProtectedRoute
                    condition={(has) =>
                      has({ permission: PermissionsEnum.WEBHOOK_READ }) ||
                      has({ permission: PermissionsEnum.WEBHOOK_WRITE })
                    }
                  >
                    <WebhooksPage />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.WEBHOOKS,
                element: (
                  <ProtectedRoute
                    condition={(has) =>
                      has({ permission: PermissionsEnum.WEBHOOK_READ }) ||
                      has({ permission: PermissionsEnum.WEBHOOK_WRITE })
                    }
                  >
                    <Navigate to={ROUTES.WEBHOOKS_ENDPOINTS} replace />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.CONNECT_HOME,
                element: (
                  <ConnectProtectedRoute>
                    <ConnectSubscriberProvider>
                      <Outlet />
                    </ConnectSubscriberProvider>
                  </ConnectProtectedRoute>
                ),
                children: [
                  { index: true, element: <ConnectDashboardPage /> },
                  { path: ROUTES.CONNECT_AGENTS, element: <AgentsPage /> },
                  {
                    path: ROUTES.CONNECT_AGENT_DETAILS_INTEGRATIONS_DETAIL,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.AGENT_READ}>
                        <AgentDetailsPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.CONNECT_AGENT_DETAILS_TAB,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.AGENT_READ}>
                        <AgentDetailsPage />
                      </ProtectedRoute>
                    ),
                  },
                  {
                    path: ROUTES.CONNECT_AGENT_DETAILS,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.AGENT_READ}>
                        <AgentDetailsPage />
                      </ProtectedRoute>
                    ),
                  },
                  { path: ROUTES.CONNECT_CONVERSATIONS, element: <ConnectConversationsPage /> },
                  { path: ROUTES.CONNECT_API_KEYS, element: <ConnectApiKeysPage /> },
                  { path: ROUTES.CONNECT_SETTINGS, element: <ConnectSettingsPage /> },
                  { path: ROUTES.CONNECT_SETTINGS_ACCOUNT, element: <ConnectSettingsPage /> },
                  { path: ROUTES.CONNECT_SETTINGS_ORGANIZATION, element: <ConnectSettingsPage /> },
                  { path: ROUTES.CONNECT_SETTINGS_TEAM, element: <ConnectSettingsPage /> },
                  { path: ROUTES.CONNECT_SETTINGS_BILLING, element: <ConnectSettingsPage /> },
                ],
              },

              {
                path: '*',
                element: <CatchAllRoute />,
              },
            ],
          },
          {
            path: ROUTES.INTEGRATIONS,
            element: (
              <ProtectedRoute permission={PermissionsEnum.INTEGRATION_READ}>
                <IntegrationsListPage />
              </ProtectedRoute>
            ),
            children: [
              {
                path: ROUTES.INTEGRATIONS_CONNECT,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.INTEGRATION_WRITE} isDrawerRoute>
                    <CreateIntegrationSidebar isOpened />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.INTEGRATIONS_CONNECT_PROVIDER,
                element: (
                  <ProtectedRoute permission={PermissionsEnum.INTEGRATION_WRITE} isDrawerRoute>
                    <CreateIntegrationSidebar isOpened />
                  </ProtectedRoute>
                ),
              },
              {
                path: ROUTES.INTEGRATIONS_UPDATE,
                element: (
                  <ProtectedRoute
                    condition={(has) =>
                      has({ permission: PermissionsEnum.INTEGRATION_WRITE }) ||
                      has({ permission: PermissionsEnum.INTEGRATION_READ })
                    }
                    isDrawerRoute
                  >
                    <UpdateIntegrationSidebar isOpened />
                  </ProtectedRoute>
                ),
              },
            ],
          },
          {
            path: ROUTES.PARTNER_INTEGRATIONS_VERCEL,
            element: (
              <ProtectedRoute permission={PermissionsEnum.PARTNER_INTEGRATION_READ}>
                <VercelIntegrationPage />
              </ProtectedRoute>
            ),
          },
          {
            path: ROUTES.SETTINGS,
            element: IS_SELF_HOSTED && !IS_ENTERPRISE ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_ACCOUNT,
            element: IS_SELF_HOSTED && !IS_ENTERPRISE ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_ORGANIZATION,
            element: IS_SELF_HOSTED && !IS_ENTERPRISE ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
          },
          {
            path: ROUTES.SETTINGS_TEAM,
            element: IS_SELF_HOSTED && !IS_ENTERPRISE ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
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

const rootElement = document.getElementById('root');

if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <FeatureFlagsProvider>
      <RouterProvider router={router} />
    </FeatureFlagsProvider>
  </StrictMode>
);

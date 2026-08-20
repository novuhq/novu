import '@novu/maily-core/style.css';
import { PermissionsEnum } from '@novu/shared';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';
import './index.css';

import { ConnectSubscriberProvider } from './components/connect/connect-subscriber-provider';
import { EE_AUTH_PROVIDER, IS_CLOUD, IS_SELF_HOSTED, IS_SELF_HOSTED_CE } from './config';
import { FeatureFlagsProvider } from './context/feature-flags-provider';
import { ErrorPage } from './pages/error-page';
import { AuthRoute, CatchAllRoute, DashboardRoute, ProtectedAuthRoute, RootRoute } from './routes';
import { EditorLayout } from './routes/editor-layout';
import { OnboardingParentRoute } from './routes/onboarding';
import { ProtectedRoute } from './routes/protected-route';
import { SideNavLayout } from './routes/side-nav-layout';
import { captureAgentTemplateIdFromUrl } from './utils/agent-template-identity';
import { captureConnectClaimTokenFromUrl } from './utils/connect-claim-pending';
import { lazyPage } from './utils/lazy-page';
import { DashboardRouteHandle } from './utils/route-handle';
import { ROUTES } from './utils/routes';
import { initializeSentry } from './utils/sentry';
import { overrideZodErrorMap } from './utils/validation';

const Landing1SignUpPage = lazyPage(() => import('./pages/landing-1-signup'), 'Landing1SignUpPage');
const CliAuthPage = lazyPage(() => import('./pages/cli-auth'), 'CliAuthPage');
const ConnectClaimPage = lazyPage(() => import('./pages/connect-claim'), 'ConnectClaimPage');
const AgentSlackSetupPage = lazyPage(() => import('./pages/agent-slack-setup-page'), 'AgentSlackSetupPage');
const AgentTelegramMobileSetupPage = lazyPage(
  () => import('./pages/agent-telegram-mobile-setup-page'),
  'AgentTelegramMobileSetupPage'
);
const AgentWhatsAppSignupPage = lazyPage(() => import('./pages/agent-whatsapp-signup-page'), 'AgentWhatsAppSignupPage');
const IntegrationStoreTelegramMobileSetupPage = lazyPage(
  () => import('./pages/integration-store-telegram-mobile-setup-page'),
  'IntegrationStoreTelegramMobileSetupPage'
);
const SignInPage = lazyPage(() => import('./pages/sign-in'), 'SignInPage');
const SignUpPage = lazyPage(() => import('./pages/sign-up'), 'SignUpPage');
const ForgotPasswordPage = lazyPage(() => import('./pages/forgot-password'), 'ForgotPasswordPage');
const ResetPasswordPage = lazyPage(() => import('./pages/reset-password'), 'ResetPasswordPage');
const SSOSignInPage = lazyPage(() => import('./pages/sso-sign-in'), 'SSOSignInPage');
const VerifyEmailPage = lazyPage(() => import('./pages/verify-email'), 'VerifyEmailPage');
const OrganizationListPage = lazyPage(() => import('./pages/organization-list'), 'OrganizationListPage');
const InvitationAcceptPage = lazyPage(() => import('./pages/invitation-accept'), 'InvitationAcceptPage');
const UsecaseSelectPage = lazyPage(() => import('./pages/usecase-select-page'), 'UsecaseSelectPage');
const AgentsPersonalizePage = lazyPage(() => import('./pages/agents-personalize-page'), 'AgentsPersonalizePage');
const AgentsSetupPage = lazyPage(() => import('./pages/agents-setup-page'), 'AgentsSetupPage');
const InboxUsecasePage = lazyPage(() => import('./pages/inbox-usecase-page'), 'InboxUsecasePage');
const InboxEmbedPage = lazyPage(() => import('./pages/inbox-embed-page'), 'InboxEmbedPage');
const InboxEmbedSuccessPage = lazyPage(() => import('./pages/inbox-embed-success-page'), 'InboxEmbedSuccessPage');
const WelcomePage = lazyPage(() => import('./pages/welcome-page'), 'WelcomePage');
const WorkflowsPage = lazyPage(() => import('./pages/workflows'), 'WorkflowsPage');
const TemplateModal = lazyPage(() => import('./pages/workflows'), 'TemplateModal');
const CreateWorkflowPage = lazyPage(() => import('./pages/create-workflow'), 'CreateWorkflowPage');
const DuplicateWorkflowPage = lazyPage(() => import('./pages/duplicate-workflow'), 'DuplicateWorkflowPage');
const SubscribersPage = lazyPage(() => import('./pages/subscribers'), 'SubscribersPage');
const EditSubscriberPage = lazyPage(() => import('./pages/edit-subscriber-page'), 'EditSubscriberPage');
const CreateSubscriberPage = lazyPage(() => import('./pages/create-subscriber'), 'CreateSubscriberPage');
const TopicsPage = lazyPage(() => import('./pages/topics'), 'TopicsPage');
const CreateTopicPage = lazyPage(() => import('./pages/create-topic'), 'CreateTopicPage');
const EditTopicPage = lazyPage(() => import('./pages/edit-topic'), 'EditTopicPage');
const ContextsPage = lazyPage(() => import('./pages/contexts'), 'ContextsPage');
const CreateContextPage = lazyPage(() => import('./pages/create-context'), 'CreateContextPage');
const EditContextPage = lazyPage(() => import('./pages/edit-context'), 'EditContextPage');
const LayoutsPage = lazyPage(() => import('./pages/layouts'), 'LayoutsPage');
const CreateLayoutPage = lazyPage(() => import('./pages/create-layout'), 'CreateLayoutPage');
const DuplicateLayoutPage = lazyPage(() => import('./pages/duplicate-layout-page'), 'DuplicateLayoutPage');
const EditLayoutPage = lazyPage(() => import('./pages/edit-layout'), 'EditLayoutPage');
const TranslationsPage = lazyPage(() => import('./pages/translations'), 'TranslationsPage');
const TranslationSettingsPage = lazyPage(() => import('./pages/translation-settings-page'), 'TranslationSettingsPage');
const EditTranslationPage = lazyPage(() => import('./pages/edit-translation'), 'EditTranslationPage');
const AgentsPage = lazyPage(() => import('./pages/agents'), 'AgentsPage');
const AgentDetailsPage = lazyPage(() => import('./pages/agent-details'), 'AgentDetailsPage');
const DomainsPage = lazyPage(() => import('./pages/domains'), 'DomainsPage');
const DomainDetailPage = lazyPage(() => import('./pages/domain-detail'), 'DomainDetailPage');
const ApiKeysPage = lazyPage(() => import('./pages/api-keys'), 'ApiKeysPage');
const EnvironmentsPage = lazyPage(() => import('./pages/environments'), 'EnvironmentsPage');
const VariablesPage = lazyPage(() => import('./pages/variables'), 'VariablesPage');
const UpsertVariablePage = lazyPage(() => import('./pages/upsert-variable'), 'UpsertVariablePage');
const ActivityFeed = lazyPage(() => import('./pages/activity-feed'), 'ActivityFeed');
const AnalyticsPage = lazyPage(() => import('./pages/analytics'), 'AnalyticsPage');
const LocalWorkflowsPage = lazyPage(() => import('./pages/local-workflows'), 'LocalWorkflowsPage');
const LocalEditWorkflowPage = lazyPage(() => import('./pages/local-edit-workflow'), 'LocalEditWorkflowPage');
const EditWorkflowPage = lazyPage(() => import('./pages/edit-workflow'), 'EditWorkflowPage');
const TestWorkflowRouteHandler = lazyPage(
  () => import('./pages/test-workflow-route-handler'),
  'TestWorkflowRouteHandler'
);
const TestWorkflowDrawerPage = lazyPage(() => import('./pages/test-workflow-drawer-page'), 'TestWorkflowDrawerPage');
const WebhooksPage = lazyPage(() => import('./pages/webhooks-page'), 'WebhooksPage');
const IntegrationsListPage = lazyPage(() => import('./pages/integrations-list-page'), 'IntegrationsListPage');
const SettingsPage = lazyPage(() => import('./pages/settings'), 'SettingsPage');
const VercelIntegrationPage = lazyPage(() => import('./pages/vercel-integration-page'), 'VercelIntegrationPage');
const RedirectToLegacyStudioAuth = lazyPage(
  () => import('./pages/redirect-to-legacy-studio-auth'),
  'RedirectToLegacyStudioAuth'
);
const LocalHandshakePage = lazyPage(() => import('./pages/local-handshake'), 'LocalHandshakePage');
const EditStepTemplateV2Page = lazyPage(() => import('./pages/edit-step-template-v2'), 'EditStepTemplateV2Page');
const ConfigureWorkflow = lazyPage(
  () => import('./components/workflow-editor/configure-workflow'),
  'ConfigureWorkflow'
);
const ConfigureStep = lazyPage(() => import('./components/workflow-editor/steps/configure-step'), 'ConfigureStep');
const EditStepConditions = lazyPage(
  () => import('./components/workflow-editor/steps/conditions/edit-step-conditions'),
  'EditStepConditions'
);
const ChannelPreferences = lazyPage(
  () => import('./components/workflow-editor/channel-preferences'),
  'ChannelPreferences'
);
const WorkflowAgentAssignment = lazyPage(
  () => import('./components/workflow-editor/workflow-agent-assignment'),
  'WorkflowAgentAssignment'
);
const CreateIntegrationSidebar = lazyPage(
  () => import('./components/integrations/components/create-integration-sidebar'),
  'CreateIntegrationSidebar'
);
const UpdateIntegrationSidebar = lazyPage(
  () => import('./components/integrations/components/update-integration-sidebar'),
  'UpdateIntegrationSidebar'
);

const hideBridgeUrlHandle: DashboardRouteHandle = { hideBridgeUrl: true };

const editorChildren = [
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
    element: <WorkflowAgentAssignment />,
    path: ROUTES.EDIT_WORKFLOW_AGENT,
  },
];

initializeSentry();
overrideZodErrorMap();
captureAgentTemplateIdFromUrl();
captureConnectClaimTokenFromUrl();

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
        path: ROUTES.CONNECT_CLAIM,
        element: <ConnectClaimPage />,
      },
      {
        path: ROUTES.AGENT_SLACK_SETUP,
        element: <AgentSlackSetupPage />,
      },
      {
        path: ROUTES.AGENT_TELEGRAM_MOBILE_SETUP,
        element: <AgentTelegramMobileSetupPage />,
      },
      {
        path: ROUTES.AGENT_WHATSAPP_SIGNUP,
        element: <AgentWhatsAppSignupPage />,
      },
      {
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
            path: ROUTES.AGENTS_PERSONALIZE,
            element: <AgentsPersonalizePage />,
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
          {
            index: true,
            element: <CatchAllRoute />,
          },
          {
            element: <SideNavLayout />,
            children: [
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
                  {
                    path: ROUTES.DOMAINS,
                    element: !IS_SELF_HOSTED_CE ? <DomainsPage /> : <Navigate to={ROUTES.ROOT} replace />,
                  },
                  {
                    path: ROUTES.DOMAIN_DETAIL,
                    element: !IS_SELF_HOSTED_CE ? <DomainDetailPage /> : <Navigate to={ROUTES.ROOT} replace />,
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
                    path: ROUTES.LOCAL_WORKFLOWS,
                    handle: hideBridgeUrlHandle,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.BRIDGE_WRITE}>
                        <LocalWorkflowsPage />
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
                path: ROUTES.SETTINGS,
                element: IS_SELF_HOSTED_CE ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
              },
              {
                path: ROUTES.SETTINGS_ACCOUNT,
                element: IS_SELF_HOSTED_CE ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
              },
              {
                path: ROUTES.SETTINGS_ORGANIZATION,
                element: IS_SELF_HOSTED_CE ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
              },
              {
                path: ROUTES.SETTINGS_TEAM,
                element: IS_SELF_HOSTED_CE ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
              },
              {
                path: ROUTES.SETTINGS_BILLING,
                element: IS_SELF_HOSTED ? <Navigate to={ROUTES.ROOT} /> : <SettingsPage />,
              },
            ],
          },
          {
            element: <EditorLayout />,
            children: [
              {
                path: ROUTES.ENV,
                children: [
                  {
                    path: ROUTES.LOCAL_EDIT_WORKFLOW,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.BRIDGE_WRITE}>
                        <LocalEditWorkflowPage />
                      </ProtectedRoute>
                    ),
                    children: [
                      ...editorChildren,
                      {
                        path: ROUTES.LOCAL_TRIGGER_WORKFLOW,
                        element: (
                          <ProtectedRoute permission={PermissionsEnum.EVENT_WRITE} isDrawerRoute>
                            <TestWorkflowDrawerPage />
                          </ProtectedRoute>
                        ),
                      },
                    ],
                  },
                  {
                    path: ROUTES.EDIT_WORKFLOW,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                        <EditWorkflowPage />
                      </ProtectedRoute>
                    ),
                    children: [
                      ...editorChildren,
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
                    path: ROUTES.LAYOUTS_EDIT,
                    element: (
                      <ProtectedRoute permission={PermissionsEnum.WORKFLOW_READ}>
                        <EditLayoutPage />
                      </ProtectedRoute>
                    ),
                  },
                ],
              },
            ],
          },
          {
            path: ROUTES.PARTNER_INTEGRATIONS_VERCEL,
            element:
              EE_AUTH_PROVIDER === 'clerk' && IS_CLOUD ? (
                <ProtectedRoute permission={PermissionsEnum.PARTNER_INTEGRATION_READ}>
                  <VercelIntegrationPage />
                </ProtectedRoute>
              ) : (
                <Navigate to={ROUTES.ROOT} replace />
              ),
          },
          {
            path: ROUTES.LOCAL_STUDIO_AUTH,
            element: <RedirectToLegacyStudioAuth />,
          },
          {
            path: ROUTES.LOCAL_HANDSHAKE,
            element: (
              <ProtectedRoute permission={PermissionsEnum.BRIDGE_WRITE}>
                <LocalHandshakePage />
              </ProtectedRoute>
            ),
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

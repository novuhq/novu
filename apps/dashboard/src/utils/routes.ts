export const ROUTES = {
  SIGN_IN: '/auth/sign-in',
  SIGN_UP: '/auth/sign-up',
  LANDING_1_SIGN_UP: '/landing-1/signup',
  SIGNUP_ORGANIZATION_LIST: '/auth/organization-list',
  INVITATION_ACCEPT: '/auth/invitation/accept',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  SSO_SIGN_IN: '/auth/sso',
  VERIFY_EMAIL: '/auth/verify-email',
  USECASE_SELECT: '/onboarding/usecase',
  INBOX_USECASE: '/onboarding/inbox',
  INBOX_EMBED: '/onboarding/inbox/embed',
  INBOX_EMBED_SUCCESS: '/onboarding/inbox/success',
  ROOT: '/',
  LOCAL_STUDIO_AUTH: '/local-studio/auth',
  ENV: '/env',
  SETTINGS: '/settings',
  SETTINGS_ACCOUNT: '/settings/account',
  SETTINGS_ORGANIZATION: '/settings/organization',
  SETTINGS_TEAM: '/settings/team',
  SETTINGS_BILLING: '/settings/billing',
  WORKFLOWS: '/env/:environmentSlug/workflows',
  TRANSLATION_SETTINGS: '/env/:environmentSlug/translations/settings',
  EDIT_WORKFLOW: '/env/:environmentSlug/workflows/:workflowSlug',
  EDIT_WORKFLOW_ACTIVITY: '/env/:environmentSlug/workflows/:workflowSlug/activity',
  TEST_WORKFLOW: '/env/:environmentSlug/workflows/:workflowSlug/test',
  TRIGGER_WORKFLOW: '/env/:environmentSlug/workflows/:workflowSlug/trigger',
  WELCOME: '/env/:environmentSlug/welcome',
  HOME: '/env/:environmentSlug/home',
  EDIT_WORKFLOW_PREFERENCES: 'preferences',
  EDIT_STEP: 'steps/:stepSlug',

  EDIT_STEP_TEMPLATE: 'steps/:stepSlug/editor',
  EDIT_STEP_CONDITIONS: 'steps/:stepSlug/conditions',
  INTEGRATIONS: '/integrations',
  INTEGRATIONS_CONNECT: '/integrations/connect',
  INTEGRATIONS_CONNECT_PROVIDER: '/integrations/connect/:providerId',
  INTEGRATIONS_UPDATE: '/integrations/:integrationId/update',
  API_KEYS: '/env/:environmentSlug/api-keys',
  ENVIRONMENTS: '/env/:environmentSlug/environments',
  ACTIVITY_FEED: '/env/:environmentSlug/activity-feed',
  ACTIVITY_WORKFLOW_RUNS: '/env/:environmentSlug/activity/workflow-runs',
  ACTIVITY_REQUESTS: '/env/:environmentSlug/activity/requests',
  ACTIVITY_CONVERSATIONS: '/env/:environmentSlug/activity/conversations',
  ANALYTICS: '/env/:environmentSlug/analytics',
  LOGS: '/env/:environmentSlug/requests',
  TEMPLATE_STORE: '/env/:environmentSlug/workflows/templates',
  WORKFLOWS_CREATE: '/env/:environmentSlug/workflows/create',
  WORKFLOWS_DUPLICATE: '/env/:environmentSlug/workflows/duplicate/:workflowId',
  TEMPLATE_STORE_CREATE_WORKFLOW: '/env/:environmentSlug/workflows/templates/:templateId',
  SUBSCRIBERS: '/env/:environmentSlug/subscribers',
  EDIT_SUBSCRIBER: '/env/:environmentSlug/subscribers/:subscriberId',
  CREATE_SUBSCRIBER: '/env/:environmentSlug/subscribers/create',
  PARTNER_INTEGRATIONS_VERCEL: '/partner-integrations/vercel',
  DOMAINS: '/env/:environmentSlug/domains',
  DOMAIN_DETAIL: '/env/:environmentSlug/domains/:domain',
  WEBHOOKS: '/env/:environmentSlug/webhooks',
  WEBHOOKS_ENDPOINTS: '/env/:environmentSlug/webhooks/endpoints',
  WEBHOOKS_EVENT_CATALOG: '/env/:environmentSlug/webhooks/event-catalog',
  WEBHOOKS_LOGS: '/env/:environmentSlug/webhooks/logs',
  WEBHOOKS_ACTIVITY: '/env/:environmentSlug/webhooks/activity',
  TOPICS: '/env/:environmentSlug/topics',
  TOPICS_CREATE: '/env/:environmentSlug/topics/create',
  TOPICS_EDIT: '/env/:environmentSlug/topics/:topicKey/edit',
  CONTEXTS: '/env/:environmentSlug/contexts',
  CONTEXTS_CREATE: '/env/:environmentSlug/contexts/create',
  CONTEXTS_EDIT: '/env/:environmentSlug/contexts/:type/:id/edit',
  LAYOUTS: '/env/:environmentSlug/layouts',
  LAYOUTS_CREATE: '/env/:environmentSlug/layouts/create',
  LAYOUTS_DUPLICATE: '/env/:environmentSlug/layouts/duplicate/:layoutId',
  LAYOUTS_EDIT: '/env/:environmentSlug/layouts/:layoutSlug',
  TRANSLATIONS: '/env/:environmentSlug/translations',
  TRANSLATIONS_EDIT: '/env/:environmentSlug/translations/:resourceType/:resourceId/:locale',
  VARIABLES: '/env/:environmentSlug/variables',
  VARIABLES_CREATE: '/env/:environmentSlug/variables/create',
  AGENTS: '/env/:environmentSlug/agents',
  AGENT_DETAILS: '/env/:environmentSlug/agents/:agentIdentifier',
  /** Must be registered before AGENT_DETAILS_TAB so `.../integrations/:integrationIdentifier` is not parsed as a tab name. */
  AGENT_DETAILS_INTEGRATIONS_DETAIL:
    '/env/:environmentSlug/agents/:agentIdentifier/integrations/:integrationIdentifier',
  AGENT_DETAILS_TAB: '/env/:environmentSlug/agents/:agentIdentifier/:agentTab',
} as const;

export const AGENT_DETAILS_DEFAULT_TAB = 'overview';

export const AGENT_DETAILS_TABS = ['overview', 'integrations'] as const;

export type AgentDetailsTab = (typeof AGENT_DETAILS_TABS)[number];

export function parseAgentDetailsTab(tab: string | undefined): AgentDetailsTab {
  if (tab && (AGENT_DETAILS_TABS as readonly string[]).includes(tab)) {
    return tab as AgentDetailsTab;
  }

  return AGENT_DETAILS_DEFAULT_TAB;
}

export const buildRoute = (route: string, params: Record<string, string>) => {
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(`:${key}`, value);
  }, route);
};

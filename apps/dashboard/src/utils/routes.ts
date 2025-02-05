export const ROUTES = {
  SIGN_IN: '/auth/sign-in',
  SIGN_UP: '/auth/sign-up',
  SIGNUP_ORGANIZATION_LIST: '/auth/organization-list',
  SIGNUP_QUESTIONNAIRE: '/onboarding/questionnaire',
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
  EDIT_WORKFLOW: '/env/:environmentSlug/workflows/:workflowSlug',
  TEST_WORKFLOW: '/env/:environmentSlug/workflows/:workflowSlug/test',
  WELCOME: '/env/:environmentSlug/welcome',
  EDIT_WORKFLOW_PREFERENCES: 'preferences',
  EDIT_STEP: 'steps/:stepSlug',
  EDIT_STEP_TEMPLATE: 'steps/:stepSlug/edit',
  EDIT_STEP_CONDITIONS: 'steps/:stepSlug/conditions',
  INTEGRATIONS: '/integrations',
  INTEGRATIONS_CONNECT: '/integrations/connect',
  INTEGRATIONS_CONNECT_PROVIDER: '/integrations/connect/:providerId',
  INTEGRATIONS_UPDATE: '/integrations/:integrationId/update',
  API_KEYS: '/env/:environmentSlug/api-keys',
  ENVIRONMENTS: '/env/:environmentSlug/environments',
  ACTIVITY_FEED: '/env/:environmentSlug/activity-feed',
  TEMPLATE_STORE: '/env/:environmentSlug/workflows/templates',
  WORKFLOWS_CREATE: '/env/:environmentSlug/workflows/create',
  TEMPLATE_STORE_CREATE_WORKFLOW: '/env/:environmentSlug/workflows/templates/:templateId',
  SUBSCRIBERS: '/env/:environmentSlug/subscribers',
} as const;

export const buildRoute = (route: string, params: Record<string, string>) => {
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(`:${key}`, value);
  }, route);
};

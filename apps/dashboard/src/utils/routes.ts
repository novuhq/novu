export const ROUTES = {
  SIGN_IN: '/sign-in',
  SIGN_UP: '/sign-up',
  SIGNUP_ORGANIZATION_LIST: '/sign-up/organization-list',
  ROOT: '/',
  ENV: '/env',
  WORKFLOWS: '/env/:environmentId/workflows',
  EDIT_WORKFLOW: '/env/:environmentId/workflows/:workflowId',
};

export const buildRoute = (route: string, params: Record<string, string>) => {
  return Object.entries(params).reduce((acc, [key, value]) => {
    return acc.replace(`:${key}`, value);
  }, route);
};

export const LEGACY_ROUTES = {
  ACTIVITY_FEED: '/legacy/activities',
  INTEGRATIONS: '/legacy/integrations',
  API_KEYS: '/legacy/api-keys',
  BRANDING: '/legacy/manage-account/branding',
  BILLING: '/legacy/manage-account/billing',
  INVITE_TEAM_MEMBERS: '/legacy/manage-account/team-members',
  SETTINGS: '/legacy/manage-account/user-profile',
};

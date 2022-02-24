// CLI Server
export const SERVER_HOST = 'localhost';
export const SERVER_PORT = 4600;
export const REDIRECT_ROUTE = '/cli/callback';
export const WIDGET_DEMO_ROUTH = '/widget-demo';

// API
const apiAddress = 'http://localhost:3000';

export const API_OAUTH_URL = `${apiAddress}/v1/auth/github`;
export const API_CREATE_ORGANIZATION_URL = `${apiAddress}/v1/organizations`;
export const API_SWITCH_ORGANIZATION_FORMAT_URL = `${apiAddress}/v1/auth/organizations/{organizationId}/switch`;
export const API_CREATE_APPLICATION_URL = `${apiAddress}/v1/applications`;
export const API_APPLICATION_ME_URL = `${apiAddress}/v1/applications/me`;
export const API_SWITCH_APPLICATION_FORMAT_URL = `${apiAddress}/v1/auth/applications/{applicationId}/switch`;
export const API_NOTIFICATION_GROUP_URL = `${apiAddress}/v1/notification-groups`;
export const API_NOTIFICATION_TEMPLATES_URL = `${apiAddress}/v1/notification-templates`;
export const API_TRIGGER_URL = `${apiAddress}/v1/events/trigger`;

// Client
export const CLIENT_LOGIN_URL = 'http://localhost:4200/auth/login';

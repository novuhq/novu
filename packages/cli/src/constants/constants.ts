import * as getPort from 'get-port';
import exp from 'constants';

// CLI Server
export const SERVER_HOST = 'localhost';
export const REDIRECT_ROUTE = '/cli/callback';
export const WIDGET_DEMO_ROUTH = '/demo';
export const TRIGGER_ROUTE = '/trigger';

// API
const apiAddress = process.env.NOVU_API_ADDRESS ?? 'https://api.novu.co';

export const API_OAUTH_URL = `${apiAddress}/v1/auth/github`;
export const API_CREATE_ORGANIZATION_URL = `${apiAddress}/v1/organizations`;
export const API_SWITCH_ORGANIZATION_FORMAT_URL = `${apiAddress}/v1/auth/organizations/{organizationId}/switch`;
export const API_CREATE_APPLICATION_URL = `${apiAddress}/v1/applications`;
export const API_APPLICATION_ME_URL = `${apiAddress}/v1/applications/me`;
export const API_APPLICATION_KEYS = `${apiAddress}/v1/applications/api-keys`;
export const API_SWITCH_APPLICATION_FORMAT_URL = `${apiAddress}/v1/auth/applications/{applicationId}/switch`;
export const API_NOTIFICATION_GROUP_URL = `${apiAddress}/v1/notification-groups`;
export const API_NOTIFICATION_TEMPLATES_URL = `${apiAddress}/v1/notification-templates`;
export const API_TRIGGER_URL = `${apiAddress}/v1/events/trigger`;

// Client
export const CLIENT_LOGIN_URL = process.env.NOVU_API_ADDRESS || 'https://web.novu.co/auth/login';

// github
export const GITHUB_DOCKER_URL = 'https://github.com/novuhq/novu/tree/main/docker';

let SERVER_PORT;

export async function setAvailablePort() {
  SERVER_PORT = await (getPort as never as () => Promise<number>)();
}

export async function getServerPort() {
  if (!SERVER_PORT) {
    throw new Error('setAvailablePort must be called a single time to generate available port');
  }

  return SERVER_PORT;
}

import * as getPort from 'get-port';
import exp from 'constants';

// CLI Server
export const SERVER_HOST = 'localhost';
export const REDIRECT_ROUTE = '/cli/callback';
export const WIDGET_DEMO_ROUTH = '/demo';
export const TRIGGER_ROUTE = '/trigger';

export const EMBED_PATH = process.env.NOVU_EMBED_PATH ?? 'https://embed.novu.co/embed.umd.min.js';

// API
const apiAddress = process.env.NOVU_API_ADDRESS ?? 'https://api.novu.co';

export const API_OAUTH_URL = `${apiAddress}/v1/auth/github`;
export const API_CREATE_ORGANIZATION_URL = `${apiAddress}/v1/organizations`;
export const API_SWITCH_ORGANIZATION_FORMAT_URL = `${apiAddress}/v1/auth/organizations/{organizationId}/switch`;
export const API_CREATE_ENVIRONMENT_URL = `${apiAddress}/v1/environments`;
export const API_ENVIRONMENT_ME_URL = `${apiAddress}/v1/environments/me`;
export const API_ENVIRONMENT_KEYS = `${apiAddress}/v1/environments/api-keys`;
export const API_SWITCH_ENVIRONMENT_FORMAT_URL = `${apiAddress}/v1/auth/environments/{environmentId}/switch`;
export const API_NOTIFICATION_GROUP_URL = `${apiAddress}/v1/notification-groups`;
export const API_NOTIFICATION_TEMPLATES_URL = `${apiAddress}/v1/notification-templates`;
export const API_TRIGGER_URL = `${apiAddress}/v1/events/trigger`;

// Client
export const CLIENT_LOGIN_URL = process.env.NOVU_CLIENT_LOGIN || 'https://web.novu.co/auth/login';

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

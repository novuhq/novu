// CLI Server
export const SERVER_HOST = 'localhost';
export const SERVER_PORT = 4600;
export const REDIRECT_ROUTE = '/cli/callback';

// API
const apiAddress = 'http://localhost:3000';
export const API_OAUTH_URL = `${apiAddress}/v1/auth/github`;
export const API_CREATE_ORGANIZATION_URL = `${apiAddress}/v1/organizations`;
export const API_SWITCH_ORGANIZATION_FORMAT_URL = `${apiAddress}/v1/auth/organizations/{organizationId}/switch`;
export const API_CREATE_APPLICATION_URL = `${apiAddress}/v1/applications`;

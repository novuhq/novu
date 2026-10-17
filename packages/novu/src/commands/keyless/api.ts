import { NOVU_ANALYTICS_SOURCE_HEADER } from '@novu/shared';
import type { AxiosResponse } from 'axios';
import { createNovuAxios, extractNovuApiMessage } from '../shared/novu-http';

export type CreatedKeylessEnvironment = {
  environmentId: string;
  secretKey: string;
  applicationIdentifier: string;
  apiUrl: string;
  claimUrl: string;
  expiresAt: string;
};

export type KeylessEnvironmentStatus = {
  environmentId: string;
  applicationIdentifier: string;
  status: 'active';
  expiresAt: string;
  claimUrl: string;
};

export class KeylessApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string
  ) {
    super(message);
    this.name = 'KeylessApiError';
  }
}

const ENVIRONMENTS_PATH = '/v1/keyless/environments';

export async function createKeylessEnvironment(input: {
  apiUrl: string;
  source?: string;
}): Promise<CreatedKeylessEnvironment> {
  return request<CreatedKeylessEnvironment>({
    apiUrl: input.apiUrl,
    method: 'POST',
    path: ENVIRONMENTS_PATH,
    body: input.source ? { source: input.source } : {},
  });
}

export async function getKeylessEnvironment(input: {
  apiUrl: string;
  secretKey: string;
}): Promise<KeylessEnvironmentStatus> {
  return request<KeylessEnvironmentStatus>({
    apiUrl: input.apiUrl,
    method: 'GET',
    path: `${ENVIRONMENTS_PATH}/me`,
    headers: { Authorization: `ApiKey ${input.secretKey}` },
  });
}

async function request<T>(input: {
  apiUrl: string;
  method: 'GET' | 'POST';
  path: string;
  body?: unknown;
  headers?: Record<string, string>;
}): Promise<T> {
  const client = createNovuAxios({
    apiUrl: input.apiUrl,
    headers: { [NOVU_ANALYTICS_SOURCE_HEADER]: 'cli', ...input.headers },
  });

  let response: AxiosResponse<unknown>;
  try {
    response = await client.request({
      url: input.path,
      method: input.method,
      data: input.body,
      validateStatus: () => true,
    });
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    throw new KeylessApiError(`Could not reach the Novu API at ${input.apiUrl}: ${reason}`, 0);
  }

  if (response.status >= 400) {
    const code = extractCode(response.data);
    const message =
      describeErrorCode(response.status, code) ??
      extractNovuApiMessage(response.data) ??
      `Novu API request failed with status ${response.status}`;

    throw new KeylessApiError(message, response.status, code);
  }

  const data = (response.data as { data?: T } | undefined)?.data;

  if (!data) {
    throw new KeylessApiError('Novu API returned an unexpected response', response.status);
  }

  return data;
}

const SIGN_UP_URL = 'https://dashboard.novu.co';

function describeErrorCode(status: number, code: string | undefined): string | undefined {
  switch (code) {
    case 'keyless_disabled':
      return `Keyless isn't available on this Novu deployment. Sign up at ${SIGN_UP_URL} to get a secret key.`;
    case 'keyless_rate_limited':
      return `Too many keyless environments were created from this network today. Try again tomorrow, or sign up at ${SIGN_UP_URL}.`;
    case 'keyless_capacity_reached':
      return `Keyless environments are at capacity today. Try again later, or sign up at ${SIGN_UP_URL}.`;
    case 'keyless_unavailable':
      return 'Keyless environments are temporarily unavailable. Try again in a few minutes.';
    case 'keyless_environment_claimed':
      return 'This environment was claimed. Replace NOVU_SECRET_KEY and NOVU_APPLICATION_IDENTIFIER with your Development environment values from the API Keys page in your Novu dashboard.';
    case 'keyless_environment_not_found':
      return "This secret key doesn't belong to a keyless environment.";
    default:
      return status === 429 ? 'Too many requests. Wait a minute and try again.' : undefined;
  }
}

function extractCode(body: unknown): string | undefined {
  if (!body || typeof body !== 'object') {
    return undefined;
  }

  const { code } = body as { code?: unknown };

  return typeof code === 'string' ? code : undefined;
}

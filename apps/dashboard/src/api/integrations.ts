import { ChannelTypeEnum, IEnvironment, IIntegration, IntegrationKindEnum } from '@novu/shared';
import { del, get, getApiBaseUrl, NovuApiError, post, put } from './api.client';

export type HealthCheckStatus = 'ready' | 'pending' | 'failed';

export type MsTeamsHealthCheckResult = {
  appRegistration: HealthCheckStatus | null;
  azureBotCreated: HealthCheckStatus | null;
  teamsAppCatalog: HealthCheckStatus | null;
  permissions: HealthCheckStatus | null;
  allReady: boolean;
};

export type CreateIntegrationData = {
  providerId: string;
  channel?: ChannelTypeEnum;
  kind?: IntegrationKindEnum;
  credentials: Record<string, unknown>;
  configurations?: Record<string, string>;
  name: string;
  identifier?: string;
  active: boolean;
  primary?: boolean;
  _environmentId?: string;
};

export enum CheckIntegrationResponseEnum {
  INVALID_EMAIL = 'invalid_email',
  BAD_CREDENTIALS = 'bad_credentials',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export type UpdateIntegrationData = {
  name: string;
  identifier: string;
  active: boolean;
  primary: boolean;
  credentials: Record<string, unknown>;
  configurations: Record<string, string>;
  check: boolean;
};

export async function getIntegrations({ environment }: { environment: IEnvironment }) {
  // TODO: This is a technical debt on the API side.
  // Integrations work across environments, so we should not need to pass the environment ID here.
  const { data } = await get<{ data: IIntegration[] }>('/integrations', { environment });

  return data;
}

export async function deleteIntegration({ id, environment }: { id: string; environment: IEnvironment }) {
  return del<{ acknowledged: boolean; status: number }>(`/integrations/${id}`, {
    environment: environment,
  });
}

export async function createIntegration(data: CreateIntegrationData, environment: IEnvironment) {
  return await post<{ data: IIntegration }>('/integrations', {
    body: data,
    environment: environment,
  });
}

export async function setAsPrimaryIntegration(integrationId: string, environment: IEnvironment) {
  return post(`/integrations/${integrationId}/set-primary`, {
    environment: environment,
  });
}

export type AutoConfigureIntegrationResponse = {
  success: boolean;
  message?: string;
  integration?: IIntegration;
};

export async function autoConfigureIntegration(integrationId: string, environment: IEnvironment) {
  const response = await post<{ data: AutoConfigureIntegrationResponse }>(
    `/integrations/${integrationId}/auto-configure`,
    {
      environment: environment,
    }
  );

  return response.data;
}

export async function updateIntegration(integrationId: string, data: UpdateIntegrationData, environment: IEnvironment) {
  return await put<IIntegration>(`/integrations/${integrationId}`, {
    body: data,
    environment: environment,
  });
}

export type SlackQuickSetupParams = {
  configToken: string;
  agentId: string;
  subscriberId?: string;
  connectionIdentifier?: string;
};

export async function slackQuickSetup(
  integrationId: string,
  params: SlackQuickSetupParams,
  environment: IEnvironment
): Promise<void> {
  await post(`/integrations/${integrationId}/slack-quick-setup`, {
    body: params,
    environment,
  });
}

export async function getMsTeamsArmTemplateDeployUrl(
  integrationId: string,
  environment: IEnvironment
): Promise<{ deployUrl: string }> {
  const { data } = await get<{ data: { deployUrl: string } }>(
    `/integrations/${integrationId}/msteams-arm-template/deploy-url`,
    { environment }
  );

  return data;
}

export async function getAzureSetupOauthUrl(
  integrationId: string,
  environment: IEnvironment
): Promise<{ url: string }> {
  const { data } = await get<{ data: { url: string } }>(
    `/integrations/${integrationId}/msteams-azure-setup/oauth-url`,
    { environment }
  );

  return data;
}

export async function getMsTeamsHealthCheck(
  integrationId: string,
  environment: IEnvironment,
  checks?: string[]
): Promise<MsTeamsHealthCheckResult> {
  const params = checks?.length ? `?checks=${checks.join(',')}` : '';
  const { data } = await get<{ data: MsTeamsHealthCheckResult }>(
    `/integrations/${integrationId}/msteams-health${params}`,
    { environment }
  );

  return data;
}

export type IntegrationStoreTelegramMobileLink = {
  token: string;
  url: string;
  /** ISO timestamp when the link expires. */
  expiresAt: string;
};

type IntegrationStoreTelegramMobileLinkEnvelope = { data: IntegrationStoreTelegramMobileLink };

/**
 * Issues a signed, single-use, short-lived JWT that lets an unauthenticated
 * mobile visitor create a Telegram integration from the Integration Store
 * create flow. The integration is created server-side on submit.
 */
export async function requestIntegrationStoreTelegramMobileLink(
  environment: IEnvironment
): Promise<IntegrationStoreTelegramMobileLink> {
  const response = await post<IntegrationStoreTelegramMobileLinkEnvelope>(
    `/integrations/telegram/mobile-link`,
    { environment }
  );

  return response.data;
}

export type IntegrationStoreTelegramMobileLinkStatus =
  | { valid: true; providerName: string }
  | { valid: false; reason: 'expired' | 'used' | 'invalid' };

/**
 * Public, unauthenticated request used by the mobile landing page where the
 * visitor does not have a Clerk session.
 */
export async function getIntegrationStoreTelegramMobileSetupStatus(
  token: string,
  signal?: AbortSignal
): Promise<IntegrationStoreTelegramMobileLinkStatus> {
  const url = `${getApiBaseUrl()}/v1/integrations/telegram/mobile-configure/status?token=${encodeURIComponent(token)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  const data = await safeJson(response);

  if (!response.ok) {
    throw new NovuApiError(extractErrorMessage(data) ?? 'Failed to load setup link', response.status, data);
  }

  return unwrapEnvelope(data) as IntegrationStoreTelegramMobileLinkStatus;
}

export type SubmitIntegrationStoreTelegramMobileCredentialsResult = {
  success: true;
  botUsername: string;
  integrationId: string;
  integrationIdentifier: string;
};

export type SubmitIntegrationStoreTelegramMobileCredentialsError = {
  code: 'token_invalid' | 'token_expired' | 'token_already_used' | 'unknown';
  message: string;
};

export class IntegrationStoreTelegramMobileSubmitError extends Error {
  constructor(
    public readonly code: SubmitIntegrationStoreTelegramMobileCredentialsError['code'],
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

export async function submitIntegrationStoreTelegramMobileCredentials(
  token: string,
  botToken: string
): Promise<SubmitIntegrationStoreTelegramMobileCredentialsResult> {
  const url = `${getApiBaseUrl()}/v1/integrations/telegram/mobile-configure`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, botToken }),
  });

  const data = await safeJson(response);

  if (!response.ok) {
    const code = extractErrorCode(data);
    const message = extractErrorMessage(data) ?? 'Failed to create Telegram integration';
    throw new IntegrationStoreTelegramMobileSubmitError(code, message, response.status);
  }

  return unwrapEnvelope(data) as SubmitIntegrationStoreTelegramMobileCredentialsResult;
}

async function safeJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Public mobile endpoints use raw `fetch` (no `api.client`), so the standard
 * `{ data: ... }` envelope from the API's `ResponseInterceptor` must be
 * unwrapped manually.
 */
function unwrapEnvelope(data: unknown): unknown {
  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return (data as { data: unknown }).data;
  }

  return data;
}

function extractErrorMessage(data: unknown): string | undefined {
  if (data && typeof data === 'object' && 'message' in data) {
    const message = (data as { message: unknown }).message;
    if (typeof message === 'string') return message;
    if (message && typeof message === 'object' && 'message' in (message as object)) {
      const inner = (message as { message: unknown }).message;

      return typeof inner === 'string' ? inner : undefined;
    }
  }

  return undefined;
}

function extractErrorCode(data: unknown): SubmitIntegrationStoreTelegramMobileCredentialsError['code'] {
  if (!data || typeof data !== 'object') return 'unknown';

  const message = (data as { message?: unknown }).message;
  const candidate =
    typeof message === 'object' && message !== null && 'code' in (message as object)
      ? (message as { code?: unknown }).code
      : (data as { code?: unknown }).code;

  if (candidate === 'token_invalid' || candidate === 'token_expired' || candidate === 'token_already_used') {
    return candidate;
  }

  return 'unknown';
}

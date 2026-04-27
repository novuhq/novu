import { DirectionEnum, DomainRouteTypeEnum, DomainStatusEnum, IEnvironment } from '@novu/shared';
import { del, get, patch, post } from './api.client';

export type DomainRouteResponse = {
  _id: string;
  _domainId: string;
  address: string;
  agentId?: string;
  type: DomainRouteTypeEnum;
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
  updatedAt: string;
  data?: Record<string, string>;
};

export type ExpectedDnsRecord = {
  type: string;
  name: string;
  content: string;
  ttl: string;
  priority: number;
};

export type DomainResponse = {
  _id: string;
  name: string;
  status: DomainStatusEnum;
  mxRecordConfigured: boolean;
  dnsProvider?: string;
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
  updatedAt: string;
  expectedDnsRecords?: ExpectedDnsRecord[];
  data?: Record<string, string>;
};

export type CreateDomainBody = { name: string; data?: Record<string, string> };
export type UpdateDomainBody = { data?: Record<string, string> };
export type CreateDomainRouteBody = Pick<DomainRouteResponse, 'address' | 'type'> & {
  agentId?: string;
  data?: Record<string, string>;
};
export type UpdateDomainRouteBody = Partial<CreateDomainRouteBody>;

export type DomainDiagnosticIssue = {
  code: string;
  severity: 'warn' | 'error';
  message: string;
  fix: string;
};

export type DiagnoseDomainResponse = {
  ok: boolean;
  runAt: string;
  checks: Array<{ code: string; status: string; latencyMs: number }>;
  issues: DomainDiagnosticIssue[];
};

export type TestDomainRouteBody = {
  from: { address: string; name?: string };
  subject: string;
  text?: string;
  html?: string;
  dryRun?: boolean;
};

export type TestDomainRouteResponse = {
  matched: boolean;
  dryRun: boolean;
  domainStatus?: string;
  type?: 'webhook' | 'agent';
  webhook?: { skipped?: boolean; latencyMs: number };
  agent?: { agentId: string; status: number; agentReply?: unknown; latencyMs: number };
  payload?: unknown;
  wouldDeliverTo?: string;
};

export type CursorPaginatedResponse<T> = {
  data: T[];
  next: string | null;
  previous: string | null;
  totalCount: number;
  totalCountCapped: boolean;
};

export type CursorPaginationParams = {
  limit?: number;
  after?: string;
  before?: string;
  orderBy?: 'updatedAt' | '_id';
  orderDirection?: DirectionEnum;
  includeCursor?: boolean;
};

export type ListDomainsParams = CursorPaginationParams & {
  name?: string;
};

export type ListDomainRoutesParams = CursorPaginationParams & {
  agentId?: string;
};

export type DomainConnectStatusResponse = {
  available: boolean;
  providerName?: string;
  providerId?: string;
  reason?: string;
  reasonCode?:
    | 'disabled'
    | 'discovery_not_configured'
    | 'unsupported_provider'
    | 'incomplete_configuration'
    | 'provider_settings_unavailable'
    | 'untrusted_provider_flow'
    | 'template_not_onboarded';
  manualRecords: ExpectedDnsRecord[];
};

export type CreateDomainConnectApplyUrlBody = {
  redirectUri?: string;
};

export type DomainConnectApplyUrlResponse = {
  applyUrl: string;
  providerName: string;
  redirectUri: string;
};

function buildCursorQuery(params: CursorPaginationParams & { agentId?: string; name?: string } = {}): string {
  const searchParams = new URLSearchParams();

  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.after) searchParams.set('after', params.after);
  if (params.before) searchParams.set('before', params.before);
  if (params.orderBy) searchParams.set('orderBy', params.orderBy);
  if (params.orderDirection) searchParams.set('orderDirection', params.orderDirection);
  if (params.includeCursor != null) searchParams.set('includeCursor', String(params.includeCursor));
  if (params.agentId) searchParams.set('agentId', params.agentId);
  if (params.name) searchParams.set('name', params.name);

  const query = searchParams.toString();

  return query ? `?${query}` : '';
}

export const fetchDomains = async (
  environment: IEnvironment,
  params: ListDomainsParams = {}
): Promise<CursorPaginatedResponse<DomainResponse>> => {
  return get<CursorPaginatedResponse<DomainResponse>>(`/domains${buildCursorQuery(params)}`, { environment });
};

export const fetchDomain = async (domain: string, environment: IEnvironment): Promise<DomainResponse> => {
  const { data } = await get<{ data: DomainResponse }>(`/domains/${encodeURIComponent(domain)}`, { environment });

  return data;
};

export const createDomain = async (body: CreateDomainBody, environment: IEnvironment): Promise<DomainResponse> => {
  const { data } = await post<{ data: DomainResponse }>(`/domains`, { body, environment });

  return data;
};

export const deleteDomain = (domain: string, environment: IEnvironment): Promise<void> =>
  del(`/domains/${encodeURIComponent(domain)}`, { environment });

export const updateDomain = async (
  domain: string,
  body: UpdateDomainBody,
  environment: IEnvironment
): Promise<DomainResponse> => {
  const { data } = await patch<{ data: DomainResponse }>(`/domains/${encodeURIComponent(domain)}`, {
    body,
    environment,
  });

  return data;
};

export const diagnoseDomain = async (domain: string, environment: IEnvironment): Promise<DiagnoseDomainResponse> => {
  const { data } = await post<{ data: DiagnoseDomainResponse }>(`/domains/${encodeURIComponent(domain)}/diagnose`, {
    body: {},
    environment,
  });

  return data;
};

export const testDomainRoute = async (
  domain: string,
  address: string,
  body: TestDomainRouteBody,
  environment: IEnvironment
): Promise<TestDomainRouteResponse> => {
  const { data } = await post<{ data: TestDomainRouteResponse }>(
    `/domains/${encodeURIComponent(domain)}/routes/${encodeURIComponent(address)}/test`,
    { body, environment }
  );

  return data;
};

export const fetchDomainRoutes = async (
  domain: string,
  environment: IEnvironment,
  params: ListDomainRoutesParams = {}
): Promise<CursorPaginatedResponse<DomainRouteResponse>> => {
  return get<CursorPaginatedResponse<DomainRouteResponse>>(
    `/domains/${encodeURIComponent(domain)}/routes${buildCursorQuery(params)}`,
    { environment }
  );
};

export const fetchDomainRoute = async (
  domain: string,
  address: string,
  environment: IEnvironment
): Promise<DomainRouteResponse> => {
  const { data } = await get<{ data: DomainRouteResponse }>(
    `/domains/${encodeURIComponent(domain)}/routes/${encodeURIComponent(address)}`,
    { environment }
  );

  return data;
};

export const createDomainRoute = async (
  domain: string,
  body: CreateDomainRouteBody,
  environment: IEnvironment
): Promise<DomainRouteResponse> => {
  const { data } = await post<{ data: DomainRouteResponse }>(`/domains/${encodeURIComponent(domain)}/routes`, {
    body,
    environment,
  });

  return data;
};

export const updateDomainRoute = async (
  domain: string,
  address: string,
  body: UpdateDomainRouteBody,
  environment: IEnvironment
): Promise<DomainRouteResponse> => {
  const { data } = await patch<{ data: DomainRouteResponse }>(
    `/domains/${encodeURIComponent(domain)}/routes/${encodeURIComponent(address)}`,
    { body, environment }
  );

  return data;
};

export const deleteDomainRoute = (domain: string, address: string, environment: IEnvironment): Promise<void> =>
  del(`/domains/${encodeURIComponent(domain)}/routes/${encodeURIComponent(address)}`, { environment });

export const verifyDomain = async (domain: string, environment: IEnvironment): Promise<DomainResponse> => {
  const { data } = await post<{ data: DomainResponse }>(`/domains/${encodeURIComponent(domain)}/verify`, {
    body: {},
    environment,
  });

  return data;
};

export const fetchDomainAutoConfigure = async (
  domain: string,
  environment: IEnvironment
): Promise<DomainConnectStatusResponse> => {
  const { data } = await get<{ data: DomainConnectStatusResponse }>(
    `/domains/${encodeURIComponent(domain)}/auto-configure`,
    {
      environment,
    }
  );

  return data;
};

export const startDomainAutoConfigure = async (
  domain: string,
  body: CreateDomainConnectApplyUrlBody,
  environment: IEnvironment
): Promise<DomainConnectApplyUrlResponse> => {
  const { data } = await post<{ data: DomainConnectApplyUrlResponse }>(
    `/domains/${encodeURIComponent(domain)}/auto-configure/start`,
    {
      body,
      environment,
    }
  );

  return data;
};

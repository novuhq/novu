import { DirectionEnum, DomainRouteTypeEnum, DomainStatusEnum, IEnvironment } from '@novu/shared';
import { del, get, patch, post } from './api.client';

export type DomainRouteResponse = {
  _id: string;
  _domainId: string;
  address: string;
  destination?: string;
  type: DomainRouteTypeEnum;
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
  updatedAt: string;
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
};

export type CreateDomainBody = { name: string };
export type UpdateDomainBody = Record<string, never>;
export type CreateDomainRouteBody = Pick<DomainRouteResponse, 'address' | 'type'> & {
  destination?: string;
};
export type UpdateDomainRouteBody = Partial<CreateDomainRouteBody>;

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
  destination?: string;
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

function buildCursorQuery(params: CursorPaginationParams & { destination?: string; name?: string } = {}): string {
  const searchParams = new URLSearchParams();

  if (params.limit != null) searchParams.set('limit', String(params.limit));
  if (params.after) searchParams.set('after', params.after);
  if (params.before) searchParams.set('before', params.before);
  if (params.orderBy) searchParams.set('orderBy', params.orderBy);
  if (params.orderDirection) searchParams.set('orderDirection', params.orderDirection);
  if (params.includeCursor != null) searchParams.set('includeCursor', String(params.includeCursor));
  if (params.destination) searchParams.set('destination', params.destination);
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

export const fetchDomain = async (domainId: string, environment: IEnvironment): Promise<DomainResponse> => {
  const { data } = await get<{ data: DomainResponse }>(`/domains/${domainId}`, { environment });

  return data;
};

export const createDomain = async (body: CreateDomainBody, environment: IEnvironment): Promise<DomainResponse> => {
  const { data } = await post<{ data: DomainResponse }>(`/domains`, { body, environment });

  return data;
};

export const deleteDomain = (domainId: string, environment: IEnvironment): Promise<void> =>
  del(`/domains/${domainId}`, { environment });

export const updateDomain = async (
  domainId: string,
  body: UpdateDomainBody,
  environment: IEnvironment
): Promise<DomainResponse> => {
  const { data } = await patch<{ data: DomainResponse }>(`/domains/${domainId}`, { body, environment });

  return data;
};

export const fetchDomainRoutes = async (
  domainId: string,
  environment: IEnvironment,
  params: ListDomainRoutesParams = {}
): Promise<CursorPaginatedResponse<DomainRouteResponse>> => {
  return get<CursorPaginatedResponse<DomainRouteResponse>>(
    `/domains/${encodeURIComponent(domainId)}/routes${buildCursorQuery(params)}`,
    { environment }
  );
};

export const fetchRoutes = async (
  environment: IEnvironment,
  params: ListDomainRoutesParams = {}
): Promise<CursorPaginatedResponse<DomainRouteResponse>> => {
  return get<CursorPaginatedResponse<DomainRouteResponse>>(`/domains/routes${buildCursorQuery(params)}`, {
    environment,
  });
};

export const fetchDomainRoute = async (
  domainId: string,
  routeId: string,
  environment: IEnvironment
): Promise<DomainRouteResponse> => {
  const { data } = await get<{ data: DomainRouteResponse }>(
    `/domains/${encodeURIComponent(domainId)}/routes/${encodeURIComponent(routeId)}`,
    { environment }
  );

  return data;
};

export const createDomainRoute = async (
  domainId: string,
  body: CreateDomainRouteBody,
  environment: IEnvironment
): Promise<DomainRouteResponse> => {
  const { data } = await post<{ data: DomainRouteResponse }>(`/domains/${encodeURIComponent(domainId)}/routes`, {
    body,
    environment,
  });

  return data;
};

export const updateDomainRoute = async (
  domainId: string,
  routeId: string,
  body: UpdateDomainRouteBody,
  environment: IEnvironment
): Promise<DomainRouteResponse> => {
  const { data } = await patch<{ data: DomainRouteResponse }>(
    `/domains/${encodeURIComponent(domainId)}/routes/${encodeURIComponent(routeId)}`,
    { body, environment }
  );

  return data;
};

export const deleteDomainRoute = (domainId: string, routeId: string, environment: IEnvironment): Promise<void> =>
  del(`/domains/${encodeURIComponent(domainId)}/routes/${encodeURIComponent(routeId)}`, { environment });

export const fetchDomainConnectStatus = async (
  domainId: string,
  environment: IEnvironment
): Promise<DomainConnectStatusResponse> => {
  const { data } = await get<{ data: DomainConnectStatusResponse }>(`/domains/${domainId}/domain-connect/status`, {
    environment,
  });

  return data;
};

export const createDomainConnectApplyUrl = async (
  domainId: string,
  body: CreateDomainConnectApplyUrlBody,
  environment: IEnvironment
): Promise<DomainConnectApplyUrlResponse> => {
  const { data } = await post<{ data: DomainConnectApplyUrlResponse }>(
    `/domains/${domainId}/domain-connect/apply-url`,
    {
      body,
      environment,
    }
  );

  return data;
};

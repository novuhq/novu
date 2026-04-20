import { DomainRouteTypeEnum, DomainStatusEnum, IEnvironment } from '@novu/shared';
import { del, get, patch, post } from './api.client';

export type DomainRouteResponse = {
  address: string;
  destination?: string;
  type: DomainRouteTypeEnum;
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
  routes: DomainRouteResponse[];
  _environmentId: string;
  _organizationId: string;
  createdAt: string;
  updatedAt: string;
  expectedDnsRecords?: ExpectedDnsRecord[];
};

export type CreateDomainBody = { name: string };
export type CreateRouteBody = { address: string; destination?: string; type: DomainRouteTypeEnum };
export type UpdateRouteBody = Partial<CreateRouteBody>;

export const fetchDomains = async (environment: IEnvironment): Promise<DomainResponse[]> => {
  const { data } = await get<{ data: DomainResponse[] }>(`/domains`, { environment });

  return data;
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

export const createRoute = async (
  domainId: string,
  body: CreateRouteBody,
  environment: IEnvironment
): Promise<DomainResponse> => {
  const { data } = await post<{ data: DomainResponse }>(`/domains/${domainId}/routes`, { body, environment });

  return data;
};

export const updateRoute = async (
  domainId: string,
  routeIndex: number,
  body: UpdateRouteBody,
  environment: IEnvironment
): Promise<DomainResponse> => {
  const { data } = await patch<{ data: DomainResponse }>(`/domains/${domainId}/routes/${routeIndex}`, {
    body,
    environment,
  });

  return data;
};

export const deleteRoute = async (
  domainId: string,
  routeIndex: number,
  environment: IEnvironment
): Promise<DomainResponse> => {
  const { data } = await del<{ data: DomainResponse }>(`/domains/${domainId}/routes/${routeIndex}`, { environment });

  return data;
};

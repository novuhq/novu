import { IEnvironment } from '@novu/shared';
import { RequestLog, RequestTraces } from '../types/logs';
import { get } from './api.client';

export interface GetRequestLogsParams {
  environment: IEnvironment;
  page?: number;
  limit?: number;
  statusCodes?: string;
  url?: string;
  urlPattern?: string;
  transactionId?: string;
  search?: string;
  createdGte?: number;
}

export interface GetRequestLogsResponse {
  data: RequestLog[];
  total: number;
  pageSize: number;
  page: number;
}

export async function getRequestLogs(params: GetRequestLogsParams): Promise<GetRequestLogsResponse> {
  const { environment, ...queryParams } = params;

  const searchParams = new URLSearchParams();
  Object.entries(queryParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  const endpoint = `/activity/requests${queryString ? `?${queryString}` : ''}`;

  return get<GetRequestLogsResponse>(endpoint, { environment });
}

export interface GetRequestTracesParams {
  environment: IEnvironment;
  requestId: string;
}

export async function getRequestTraces(params: GetRequestTracesParams): Promise<RequestTraces> {
  const { environment, requestId } = params;
  const endpoint = `/activity/requests/${requestId}`;

  const response = await get<{ data: RequestTraces }>(endpoint, { environment });

  return response?.data;
}

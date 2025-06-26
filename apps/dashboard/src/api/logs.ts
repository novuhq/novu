import { IEnvironment } from '@novu/shared';
import { get } from './api.client';
import { RequestLog } from '../types/logs';

export interface GetRequestLogsParams {
  environment: IEnvironment;
  page?: number;
  limit?: number;
  statusCode?: string;
  url?: string;
  transactionId?: string;
  search?: string;
  created?: string;
}

export interface GetRequestLogsResponse {
  data: RequestLog[];
  total: number;
  pageSize?: number;
  page?: number;
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
  const endpoint = `/logs/requests${queryString ? `?${queryString}` : ''}`;

  return get<GetRequestLogsResponse>(endpoint, { environment });
}

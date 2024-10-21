import { getToken } from '@/utils/auth';
import { API_HOSTNAME } from '../config';
import { getEnvironmentId } from '@/utils/environment';

class NovuApiError extends Error {
  constructor(
    message: string,
    public error: unknown,
    public status: number
  ) {
    super(message);
  }
}

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

const request = async <T>(
  endpoint: string,
  options?: {
    data?: unknown;
    method?: HttpMethod;
    headers?: HeadersInit;
    version?: 'v1' | 'v2';
  }
): Promise<T> => {
  const { data, headers, method = 'GET', version = 'v1' } = options || {};
  try {
    const jwt = await getToken();
    const environmentId = getEnvironmentId();
    const config: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        ...(environmentId && { 'Novu-Environment-Id': environmentId }),
        ...headers,
      },
    };

    if (data) {
      config.body = JSON.stringify(data);
    }

    const baseUrl = API_HOSTNAME ?? 'https://api.novu.co';
    const response = await fetch(`${baseUrl}/${version}${endpoint}`, config);

    if (!response.ok) {
      const errorData = await response.json();
      throw new NovuApiError(`Novu API error`, errorData, response.status);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof NovuApiError) {
      throw error;
    }
    if (typeof error === 'object' && error && 'message' in error) {
      throw new Error(`Fetch error: ${error.message}`);
    }
    throw new Error(`Fetch error: ${JSON.stringify(error)}`);
  }
};

export const get = <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' });
export const post = <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'POST', data });
export const put = <T>(endpoint: string, data: unknown) => request<T>(endpoint, { method: 'PUT', data });
export const del = <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' });

export const getV2 = <T>(endpoint: string) => request<T>(endpoint, { version: 'v2', method: 'GET' });
export const postV2 = <T>(endpoint: string, data: unknown) =>
  request<T>(endpoint, { version: 'v2', method: 'POST', data });
export const putV2 = <T>(endpoint: string, data: unknown) =>
  request<T>(endpoint, { version: 'v2', method: 'PUT', data });
export const delV2 = <T>(endpoint: string) => request<T>(endpoint, { version: 'v2', method: 'DELETE' });

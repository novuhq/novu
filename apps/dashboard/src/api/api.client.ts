import { getToken } from '@/utils/auth';
import { API_ROOT } from '../config';
import { getEnvironmentId } from '@/utils/local-storage';

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
  method: HttpMethod = 'GET',
  data?: unknown,
  headers?: HeadersInit
): Promise<T> => {
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

    const baseUrl = API_ROOT ?? 'https://api.novu.co';
    const response = await fetch(`${baseUrl}/v1${endpoint}`, config);

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

export const get = <T>(endpoint: string) => request<T>(endpoint, 'GET');

export const post = <T>(endpoint: string, data: unknown) => request<T>(endpoint, 'POST', data);

export const put = <T>(endpoint: string, data: unknown) => request<T>(endpoint, 'PUT', data);

export const del = <T>(endpoint: string) => request<T>(endpoint, 'DELETE');

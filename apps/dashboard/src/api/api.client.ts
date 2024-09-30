import axios from 'axios';
import { API_ROOT } from '../config';

export function buildApiHttpClient({
  baseURL = API_ROOT || 'https://api.novu.co',
  secretKey,
  jwt,
  environmentId,
}: {
  baseURL?: string;
  secretKey?: string;
  jwt?: string;
  environmentId?: string;
}) {
  if (!secretKey && !jwt) {
    throw new Error('A secretKey or jwt is required to create a Novu API client.');
  }

  const authHeader = jwt ? `Bearer ${jwt}` : `ApiKey ${secretKey}`;

  const httpClient = axios.create({
    baseURL,
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
      'Novu-Environment-Id': environmentId,
    },
  });

  const get = async (url: string, params?: Record<string, string | string[] | number>) => {
    // eslint-disable-next-line no-useless-catch
    try {
      const response = await httpClient.get(url, { params });

      return response.data;
    } catch (error) {
      // TODO: Handle error?.response?.data || error?.response || error;
      throw error;
    }
  };

  // // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const post = async <T>(url: string, data = {}): Promise<T> => {
  //   // eslint-disable-next-line no-useless-catch
  //   try {
  //     const response = await httpClient.post(url, data);

  //     return response.data;
  //   } catch (error) {
  //     // TODO: Handle error?.response?.data || error?.response || error;
  //     throw error;
  //   }
  // };

  // // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // const del = async (url: string, data = {}) => {
  //   // eslint-disable-next-line no-useless-catch
  //   try {
  //     const response = await httpClient.delete(url, data);

  //     return response.data;
  //   } catch (error) {
  //     // TODO: Handle error?.response?.data || error?.response || error;
  //     throw error;
  //   }
  // };

  return {
    async getEnvironments() {
      return get('/v1/environments');
    },
    async getCurrentEnvironment() {
      return get('/v1/environments/me');
    },
    async getDefaultLocale() {
      return get(`/v1/translations/defaultLocale`);
    },
  };
}

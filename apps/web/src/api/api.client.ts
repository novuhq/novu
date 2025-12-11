import { CustomDataType, IPaginationWithQueryParams, WorkflowPreferences } from '@novu/shared';
import axios from 'axios';
import { getToken } from '../components/providers/AuthProvider';
import { clearEnvironmentId, getEnvironmentId } from '../components/providers/EnvironmentProvider';
import { API_ROOT } from '../config';
import { apiHostnameManager } from '../utils/api-hostname-manager';

interface IOptions {
  absoluteUrl: boolean;
}

axios.interceptors.request.use(async (config) => {
  config.headers.set('Novu-Environment-Id', getEnvironmentId());
  config.headers.set('Authorization', `Bearer ${await getToken()}`);

  return config;
});

/** @deprecated Migrate all api methods to the new buildApiHttpClient that allows runtime configuration on the client object. */
export const api = {
  get(url: string, options: IOptions = { absoluteUrl: false }) {
    return axios
      .get(buildUrl(url, options.absoluteUrl))
      .then((response) => {
        return response.data?.data;
      })
      .catch((error) => {
        if (error?.response?.status === 401) {
          /*
           * 401 can be caused due to invalid user, organization or environment data.
           * Clerk handles the invalid user and organization data, but we need to clear the invalid environment data.
           */
          clearEnvironmentId();
        }

        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  getFullResponse(url: string, params?: { [key: string]: string | string[] | number }) {
    const baseUrl = apiHostnameManager.getApiHostname();
    return axios
      .get(`${baseUrl}${url}`, { params })
      .then((response) => response.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  put(url: string, payload) {
    const baseUrl = apiHostnameManager.getApiHostname();
    return axios
      .put(`${baseUrl}${url}`, payload)
      .then((response) => response.data?.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  post(url: string, payload, params?: CustomDataType) {
    const baseUrl = apiHostnameManager.getApiHostname();
    return axios
      .post(`${baseUrl}${url}`, payload, { params })
      .then((response) => response.data?.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  patch(url: string, payload, params?: CustomDataType) {
    const baseUrl = apiHostnameManager.getApiHostname();
    return axios
      .patch(`${baseUrl}${url}`, payload, { params })
      .then((response) => response.data?.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  delete(url: string, payload = {}) {
    const baseUrl = apiHostnameManager.getApiHostname();
    return axios
      .delete(`${baseUrl}${url}`, payload)
      .then((response) => response.data?.data)
      .catch((error) => {
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
};

function buildUrl(url: string, absoluteUrl: boolean) {
  const baseUrl = apiHostnameManager.getApiHostname();
  return absoluteUrl ? url : `${baseUrl}${url}`;
}

// WIP: The static API client needs to be replaced by a dynamic API client where api keys are injected.
export function buildApiHttpClient({
  baseURL = apiHostnameManager.getApiHostname() || API_ROOT || 'https://api.novu.co',
  secretKey,
  environmentId = getEnvironmentId(),
}: {
  baseURL?: string;
  secretKey?: string;
  environmentId?: string;
}) {
  const httpClient = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  httpClient.interceptors.request.use(async (config) => {
    let authHeaderValue = '';

    if (secretKey) {
      authHeaderValue = `ApiKey ${secretKey}`;
    } else {
      const token = await getToken();
      authHeaderValue = `Bearer ${token}`;
      config.headers.set('Novu-Environment-Id', environmentId);
    }

    config.headers.set('Authorization', authHeaderValue);

    return config;
  });

  const get = async (url, params?: Record<string, string | string[] | number>) => {
    try {
      const response = await httpClient.get(url, { params });

      return response.data;
    } catch (error) {
      // TODO: Handle error?.response?.data || error?.response || error;
      throw error;
    }
  };

  const post = async (url, data = {}) => {
    try {
      const response = await httpClient.post(url, data);

      return response.data;
    } catch (error) {
      // TODO: Handle error?.response?.data || error?.response || error;
      throw error;
    }
  };

  const del = async (url, data = {}) => {
    try {
      const response = await httpClient.delete(url, data);

      return response.data;
    } catch (error) {
      // TODO: Handle error?.response?.data || error?.response || error;
      throw error;
    }
  };

  return {
    async getNotifications(params?: { page?: number; transactionId?: string }) {
      return get(`/v1/notifications`, params);
    },

    async getNotificationsList({ page = 0, limit = 10, query }: IPaginationWithQueryParams) {
      const params = { page, limit, ...(query && { query }) };

      return get(`/v1/notification-templates`, params);
    },

    async getNotification(notificationId: string) {
      return get(`/v1/notifications/${notificationId}`);
    },

    async getApiKeys() {
      return get(`/v1/environments/api-keys`);
    },

    async syncBridge(bridgeUrl: string) {
      return post(`/v1/bridge/sync?source=studio`, {
        bridgeUrl,
      });
    },

    async getPreferences(workflowId: string) {
      return get(`/v1/preferences?workflowId=${workflowId}`);
    },

    async upsertPreferences(workflowId: string, preferences: WorkflowPreferences) {
      return post('/v1/preferences', { workflowId, preferences });
    },

    async deletePreferences(workflowId: string) {
      return del(`/v1/preferences?workflowId=${workflowId}`);
    },

    async postTelemetry(event: string, data?: Record<string, unknown>) {
      return post('/v1/telemetry/measure', {
        event,
        data,
      });
    },
  };
}

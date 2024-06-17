import axios from 'axios';
import { CustomDataType } from '@novu/shared';

const BRIDGE_ENDPOINT = 'https://few-dots-guess.loca.lt/api/echo';

interface IOptions {
  absoluteUrl: boolean;
}

export const bridgeHttp = {
  get(url: string, params = {}) {
    return axios
      .get(buildUrl(url), {
        headers: getHeaders(),
        params,
      })
      .then((response) => {
        return response.data;
      })
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  put(url: string, payload) {
    return axios
      .put(`${BRIDGE_ENDPOINT}${url}`, payload, {
        headers: getHeaders(),
      })
      .then((response) => response.data?.data)
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  post(url: string, payload, params?: CustomDataType) {
    return axios
      .post(`${BRIDGE_ENDPOINT}${url}`, payload, { params, headers: getHeaders() })
      .then((response) => response.data?.data)
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
};

function buildUrl(url: string) {
  return BRIDGE_ENDPOINT;
}

function getHeaders() {
  return {
    'Bypass-Tunnel-Reminder': true,
  };
}

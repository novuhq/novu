import axios from 'axios';
import { IParamObject } from '@novu/shared';

import { API_ROOT } from '../config';

interface IOptions {
  absoluteUrl: boolean;
}

export const api = {
  get(url: string, options: IOptions = { absoluteUrl: false }) {
    return axios
      .get(buildUrl(url, options.absoluteUrl), {
        headers: getHeaders(),
      })
      .then((response) => {
        return response.data?.data;
      })
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  getFullResponse(url: string, params?: { [key: string]: string | string[] | number }) {
    return axios
      .get(`${API_ROOT}${url}`, {
        params,
        headers: getHeaders(),
      })
      .then((response) => response.data)
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  put(url: string, payload) {
    return axios
      .put(`${API_ROOT}${url}`, payload, {
        headers: getHeaders(),
      })
      .then((response) => response.data?.data)
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  post(url: string, payload, params?: IParamObject) {
    return axios
      .post(`${API_ROOT}${url}`, payload, { params, headers: getHeaders() })
      .then((response) => response.data?.data)
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  patch(url: string, payload) {
    return axios
      .patch(`${API_ROOT}${url}`, payload, {
        headers: getHeaders(),
      })
      .then((response) => response.data?.data)
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
  delete(url: string, payload = {}) {
    return axios
      .delete(`${API_ROOT}${url}`, {
        ...payload,
        headers: getHeaders(),
      })
      .then((response) => response.data?.data)
      .catch((error) => {
        // eslint-disable-next-line promise/no-return-wrap
        return Promise.reject(error?.response?.data || error?.response || error);
      });
  },
};

function buildUrl(url: string, absoluteUrl: boolean) {
  return absoluteUrl ? url : `${API_ROOT}${url}`;
}

function getHeaders() {
  const token = localStorage.getItem('auth_token');

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : undefined;
}

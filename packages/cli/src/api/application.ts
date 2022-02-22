import { API_APPLICATION_ME_URL, API_CREATE_APPLICATION_URL } from '../constants';
import { get, post } from './api.service';

export function createApplication(applicationName: string) {
  return post(API_CREATE_APPLICATION_URL, { name: applicationName });
}

export function getApplicationMe() {
  return get(API_APPLICATION_ME_URL);
}

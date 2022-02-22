import { API_APPLICATION_ME_URL, API_CREATE_APPLICATION_URL, API_SWITCH_APPLICATION_FORMAT_URL } from '../constants';
import { get, post } from './api.service';

export function createApplication(applicationName: string) {
  return post(API_CREATE_APPLICATION_URL, { name: applicationName });
}

export function getApplicationMe() {
  return get(API_APPLICATION_ME_URL);
}

export async function switchApplication(applicationId: string): Promise<string> {
  return (await post(API_SWITCH_APPLICATION_FORMAT_URL.replace('{applicationId}', applicationId), {})).token;
}

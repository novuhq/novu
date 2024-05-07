import { IEnvironment } from '@novu/shared';
import {
  API_ENVIRONMENT_KEYS,
  API_ENVIRONMENT_ME_URL,
  API_CREATE_ENVIRONMENT_URL,
  API_SWITCH_ENVIRONMENT_FORMAT_URL,
} from '../constants';
import { get, post } from './api.service';

export function createEnvironment(environmentName: string) {
  return post(API_CREATE_ENVIRONMENT_URL, { name: environmentName });
}

export function getEnvironmentMe(): Promise<IEnvironment> {
  return get(API_ENVIRONMENT_ME_URL);
}

export async function switchEnvironment(environmentId: string): Promise<string> {
  return (await post(API_SWITCH_ENVIRONMENT_FORMAT_URL.replace('{environmentId}', environmentId), {})).token;
}

export function getEnvironmentApiKeys(): Promise<IEnvironment> {
  return get(API_ENVIRONMENT_KEYS);
}

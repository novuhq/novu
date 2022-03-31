import { IOrganizationDTO } from '@novu/shared';
import { API_CREATE_ORGANIZATION_URL, API_SWITCH_ORGANIZATION_FORMAT_URL } from '../constants';
import { post } from './api.service';

export function createOrganization(organizationName: string): Promise<IOrganizationDTO> {
  return post(API_CREATE_ORGANIZATION_URL, { name: organizationName });
}

export function switchOrganization(organizationId: string): Promise<string> {
  return post(API_SWITCH_ORGANIZATION_FORMAT_URL.replace('{organizationId}', organizationId), {});
}

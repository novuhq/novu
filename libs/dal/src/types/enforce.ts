import type { EnvironmentId } from '../repositories/environment';
import type { OrganizationId } from '../repositories/organization';

export type EnforceOrgId = '_organizationId';
export type EnforceEnvId = '_environmentId';
export type EnforceEnvOrOrgIds = EnforceEnvId | EnforceOrgId;

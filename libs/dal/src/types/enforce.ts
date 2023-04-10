import type { EnvironmentId } from '../repositories/environment';
import type { OrganizationId } from '../repositories/organization';

export type EnforceOrgId = { _organizationId: OrganizationId };
export type EnforceEnvId = { _environmentId: EnvironmentId };
export type EnforceEnvOrOrgIds = EnforceEnvId | EnforceOrgId;

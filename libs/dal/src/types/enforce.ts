import type { EnvironmentId } from '../repositories/environment';
import type { OrganizationId } from '../repositories/organization';

export type EnforceOrgId = { _organizationId: OrganizationId };
export type EnforceEnvOrOrgIds = { _environmentId: EnvironmentId } | EnforceOrgId;

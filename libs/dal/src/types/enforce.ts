import { ObjectIdType } from './helpers';

export type EnforceOrgId = { _organizationId: ObjectIdType };
export type EnforceEnvId = { _environmentId: ObjectIdType };
export type EnforceEnvOrOrgIds = EnforceOrgId | EnforceEnvId;
export type NoEnforce = object;

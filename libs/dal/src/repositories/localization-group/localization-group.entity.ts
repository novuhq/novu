import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';
import type { ChangePropsValueType } from '../../types/helpers';

export enum LocalizationResourceType {
  WORKFLOW = 'workflow',
}

export class LocalizationGroupEntity {
  _id: string;

  resourceType: LocalizationResourceType;
  resourceId: string;

  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  createdAt: string;
  updatedAt: string;
}

export type LocalizationGroupDBModel = ChangePropsValueType<
  LocalizationGroupEntity,
  '_environmentId' | '_organizationId'
>;

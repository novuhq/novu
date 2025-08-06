import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export enum LocalizationResourceEnum {
  WORKFLOW = 'workflow',
}

export class LocalizationGroupEntity {
  _id: string;

  resourceType: LocalizationResourceEnum;
  resourceId: string;
  resourceName: string;

  _resourceInternalId: string;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  createdAt: string;
  updatedAt: string;
}

export type LocalizationGroupDBModel = ChangePropsValueType<
  LocalizationGroupEntity,
  '_environmentId' | '_organizationId' | '_resourceInternalId'
>;

import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class LocalizationEntity {
  _id: string;

  locale: string;
  content: string;
  _localizationGroupId: string;
  _environmentId: EnvironmentId;
  _organizationId: OrganizationId;
  createdAt: string;
  updatedAt: string;
}

export type LocalizationDBModel = ChangePropsValueType<
  LocalizationEntity,
  '_environmentId' | '_organizationId' | '_localizationGroupId'
>;

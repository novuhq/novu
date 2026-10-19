import {
  EnvironmentId,
  EnvironmentVariableId,
  EnvironmentVariableType,
  IEnvironmentVariable,
  IEnvironmentVariableValue,
  OrganizationId,
} from '@novu/shared';
import { ChangePropsValueType } from '../../types/helpers';

export class EnvironmentVariableValueEntity implements IEnvironmentVariableValue {
  _environmentId: EnvironmentId;
  value: string;
}

export class EnvironmentVariableEntity implements IEnvironmentVariable {
  _id: EnvironmentVariableId;

  _organizationId: OrganizationId;

  key: string;

  type: EnvironmentVariableType;

  isSecret: boolean;

  values: EnvironmentVariableValueEntity[];

  createdAt: string;

  updatedAt: string;

  _updatedBy?: string;
}

export type EnvironmentVariableDBModel = ChangePropsValueType<
  EnvironmentVariableEntity,
  '_organizationId' | '_updatedBy'
>;

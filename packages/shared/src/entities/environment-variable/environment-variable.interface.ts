import { EnvironmentId, EnvironmentVariableId, OrganizationId } from '../../types';

export enum EnvironmentVariableType {
  STRING = 'string',
}

export interface IEnvironmentVariableValue {
  _environmentId: EnvironmentId;
  value: string;
}

export interface IEnvironmentVariable {
  _id: EnvironmentVariableId;
  _organizationId: OrganizationId;
  key: string;
  type: EnvironmentVariableType;
  isSecret: boolean;
  values: IEnvironmentVariableValue[];
  createdAt: string;
  updatedAt: string;
  _updatedBy?: string;
}

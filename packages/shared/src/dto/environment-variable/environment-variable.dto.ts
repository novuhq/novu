import { EnvironmentVariableType } from '../../entities/environment-variable/environment-variable.interface';
import { EnvironmentId } from '../../types';

export interface IEnvironmentVariableValueDto {
  _environmentId: EnvironmentId;
  value: string;
}

export interface ICreateEnvironmentVariableDto {
  key: string;
  type?: EnvironmentVariableType;
  isSecret?: boolean;
  values?: IEnvironmentVariableValueDto[];
}

export interface IUpdateEnvironmentVariableDto {
  key?: string;
  type?: EnvironmentVariableType;
  isSecret?: boolean;
  values?: IEnvironmentVariableValueDto[];
}

import { ICredentials } from '../../entities/integration';
import type { EnvironmentId } from '../../types';
import { BuilderFieldType, BuilderGroupValues, FilterParts } from '../../types';

export type ICredentialsDto = ICredentials;

export interface IConstructIntegrationDto {
  name?: string;
  identifier?: string;
  _environmentId?: EnvironmentId;
  credentials?: ICredentialsDto;
  active?: boolean;
  check?: boolean;
  /** @deprecated Use `rules` (JSONLogic) instead. */
  conditions?: {
    isNegated?: boolean;
    type?: BuilderFieldType;
    value?: BuilderGroupValues;
    children?: FilterParts[];
  }[];
  rules?: Record<string, unknown> | null;
}

import { ICredentials } from '../../entities/integration';
import type { EnvironmentId } from '../../types';

export type ICredentialsDto = ICredentials;

export interface IConstructIntegrationDto {
  name?: string;
  identifier?: string;
  _environmentId?: EnvironmentId;
  credentials?: ICredentialsDto;
  active?: boolean;
  check?: boolean;
}

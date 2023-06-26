import { ICredentials } from '../../entities/integration';

export type ICredentialsDto = ICredentials;

export interface IConstructIntegrationDto {
  credentials: ICredentialsDto;

  active: boolean;
}

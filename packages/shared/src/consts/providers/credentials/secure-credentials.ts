import { CredentialsKeyEnum } from '../../../types';

export const secureCredentials: CredentialsKeyEnum[] = [
  CredentialsKeyEnum.ApiKey,
  CredentialsKeyEnum.ApiToken,
  CredentialsKeyEnum.Headers,
  CredentialsKeyEnum.SecretKey,
  CredentialsKeyEnum.Token,
  CredentialsKeyEnum.Password,
  CredentialsKeyEnum.ServiceAccount,
  CredentialsKeyEnum.SigningSecret,
];

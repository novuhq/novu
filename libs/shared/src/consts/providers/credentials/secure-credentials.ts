import { CredentialsKeyEnum } from '../provider.enum';

export const secureCredentials: CredentialsKeyEnum[] = [
  CredentialsKeyEnum.ApiKey,
  CredentialsKeyEnum.SecretKey,
  CredentialsKeyEnum.Token,
  CredentialsKeyEnum.Secure,
  CredentialsKeyEnum.Password,
];

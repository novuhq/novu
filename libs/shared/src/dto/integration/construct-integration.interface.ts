export interface ICredentialsDto {
  apiKey?: string;
  user?: string;
  secretKey?: string;
  domain?: string;
  password?: string;
  host?: string;
  port?: string;
  secure?: boolean;
  region?: string;
  accountSid?: string;
  messageProfileId?: string;
  token?: string;
  from?: string;
}
export interface IConstructIntegrationDto {
  credentials: ICredentialsDto;

  active: boolean;
}

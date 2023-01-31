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
  senderName?: string;
  projectName?: string;
}

export interface ILimitsDto {
  softLimit: number;
  hardLimit: number;
}
export interface IConstructIntegrationDto {
  credentials: ICredentialsDto;
  limits?: ILimitsDto;
  active: boolean;
}

export interface ICredentialsDto {
  apiKey: string;

  secretKey: string;
}
export interface IConstructIntegrationDto {
  credentials: ICredentialsDto;

  active: boolean;
}

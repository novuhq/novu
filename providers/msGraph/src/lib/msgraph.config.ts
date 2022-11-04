// eslint-disable-next-line @typescript-eslint/naming-convention
export interface MSGraphConfig {
  clientId: string;
  authority: string;
  secret: string;
  scopes: string;
  user: string;
  fromAddress: string;
  fromName: string;
}

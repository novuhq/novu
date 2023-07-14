export interface ICredentials {
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
  applicationId?: string;
  clientId?: string;
  projectName?: string;
  serviceAccount?: string;
  baseUrl?: string;
  webhookUrl?: string;
  requireTls?: boolean;
  ignoreTls?: boolean;
  tlsOptions?: Record<string, unknown>;
  redirectUrl?: string;
  hmac?: boolean;
  ipPoolName?: string;
}

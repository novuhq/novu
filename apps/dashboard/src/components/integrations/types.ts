import { ChannelTypeEnum } from '@novu/shared';

export type TableIntegration = {
  integrationId: string;
  name: string;
  identifier: string;
  provider: string;
  providerId: string;
  channel: ChannelTypeEnum;
  environment: string;
  active: boolean;
  primary?: boolean;
  isPrimary?: boolean;
};

export type IntegrationFormData = {
  name: string;
  identifier: string;
  active: boolean;
  primary: boolean;
  credentials: Record<string, string>;
  configurations: Record<string, string>;
  check: boolean;
  environmentId: string;
  rules?: Record<string, unknown> | null;
};

export type IntegrationStep = 'select' | 'configure';

/** The integration a Quick setup made on the server, with the environment it lives in. */
export type QuickSetupResult = {
  integrationId: string;
  environmentId: string;
  /** Slack: the app Novu created. Microsoft Teams: the client ID of the app registration Novu created. */
  appId?: string;
  /** Microsoft Teams: true once the Microsoft sign-in was opened, from when the Azure resources are polled. */
  isAzureSetupStarted?: boolean;
  /** Microsoft Teams: counts the Azure setups started. Each one creates a new app registration. */
  azureSetupAttempt?: number;
  /** Microsoft Teams: the client ID an earlier Azure setup saved, which the next one replaces. */
  staleAppId?: string;
  /** WhatsApp: what Embedded Signup saves the credentials onto, and the number once it has. */
  integrationIdentifier?: string;
  isWhatsAppConnected?: boolean;
  connectedPhone?: string;
};

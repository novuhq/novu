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

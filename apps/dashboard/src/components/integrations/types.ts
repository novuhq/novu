import { ChannelTypeEnum } from '@novu/shared';

export type TableIntegration = {
  integrationId: string;
  name: string;
  identifier: string;
  provider: string;
  channel: ChannelTypeEnum;
  environment: string;
  active: boolean;
  conditions?: string[];
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
};

export type IntegrationStep = 'select' | 'configure';

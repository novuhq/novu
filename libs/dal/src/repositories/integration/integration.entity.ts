import { Types } from 'mongoose';
import { ChannelTypeEnum } from '@novu/shared';

import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

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
  ipPoolName?: string;
  requireTls?: boolean;
  ignoreTls?: boolean;
  tlsOptions?: Record<string, unknown>;
}

export class IntegrationEntity {
  _id?: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  providerId: string;

  channel: ChannelTypeEnum;

  credentials: ICredentials;

  active: boolean;

  deleted: boolean;

  deletedAt: string;

  deletedBy: string;
}

export type IntegrationDBModel = Omit<IntegrationEntity, '_environmentId' | '_organizationId'> & {
  _environmentId: Types.ObjectId;

  _organizationId: Types.ObjectId;
};

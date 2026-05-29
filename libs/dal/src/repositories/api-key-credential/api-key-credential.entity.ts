import type { PermissionsEnum } from '@novu/shared';

import type { ChangePropsValueType } from '../../types/helpers';
import type { OrganizationId } from '../organization';

export class ApiKeyCredentialEntity {
  _id: string;

  _organizationId: OrganizationId;

  _serviceAccountId: string;

  hash: string;

  keyPrefix: string;

  last4: string;

  name?: string;

  permissions: PermissionsEnum[];

  metadata?: Record<string, unknown>;

  lastUsedAt?: string;

  expiresAt?: string;

  revokedAt?: string;

  createdAt: string;

  updatedAt: string;
}

export type ApiKeyCredentialDBModel = ChangePropsValueType<
  ApiKeyCredentialEntity,
  '_organizationId' | '_serviceAccountId'
>;

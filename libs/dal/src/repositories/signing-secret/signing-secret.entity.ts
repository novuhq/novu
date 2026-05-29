import type { EncryptedSecret } from '@novu/shared';
import { SigningSecretStatusEnum, SigningSecretTypeEnum } from '@novu/shared';

import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export { SigningSecretStatusEnum };

export class SigningSecretEntity {
  _id: string;

  _organizationId: OrganizationId;

  _environmentId: EnvironmentId;

  type: SigningSecretTypeEnum;

  secret: EncryptedSecret;

  status: SigningSecretStatusEnum;

  expiresAt?: string;

  revokedAt?: string;

  createdAt: string;

  updatedAt: string;
}

export type SigningSecretDBModel = ChangePropsValueType<
  SigningSecretEntity,
  '_organizationId' | '_environmentId'
>;

import { TenantCustomData } from '@novu/shared';
import { TenantId } from './types';
import { EnvironmentId } from '../environment';
import { ChangePropsValueType } from '../../types/helpers';

export class TenantEntity {
  _id: TenantId;

  identifier: string;

  name?: string;

  deleted?: boolean;

  createdAt: string;

  data?: TenantCustomData;

  _environmentId: EnvironmentId;
}

export type TenantDBModel = ChangePropsValueType<TenantEntity, '_environmentId'>;

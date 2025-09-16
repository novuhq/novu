import { Context, ContextData, ContextId, ContextTypeEnum } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ContextEntity implements Context {
  _id: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  identifier: ContextId;
  type: ContextTypeEnum;
  data: ContextData;

  createdAt: string;
  updatedAt: string;
}

export type ContextDBModel = ChangePropsValueType<ContextEntity, '_environmentId' | '_organizationId'>;

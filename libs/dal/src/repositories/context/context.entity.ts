import { ContextData, ContextKey, ContextTypeEnum, IContext } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ContextEntity implements IContext {
  _id: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  id: string;
  type: ContextTypeEnum;
  key: ContextKey;
  data: ContextData;

  createdAt: string;
  updatedAt: string;
}

export type ContextDBModel = ChangePropsValueType<ContextEntity, '_environmentId' | '_organizationId'>;

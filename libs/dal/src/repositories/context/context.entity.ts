import { Context, ContextData, ContextId, ContextType } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class ContextEntity implements Context {
  _id: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  id: ContextId;
  type: ContextType;
  data: ContextData;

  key: string;

  createdAt: string;
  updatedAt: string;
}

export type ContextDBModel = ChangePropsValueType<ContextEntity, '_environmentId' | '_organizationId'>;

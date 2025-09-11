import { ContextData, ContextKey, ContextTypeEnum } from '../../types/context';
import { EnvironmentId } from '../../types/environment';
import { OrganizationId } from '../../types/organization';

export interface IContext {
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

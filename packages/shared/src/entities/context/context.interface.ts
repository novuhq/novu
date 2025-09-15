import { ContextData, ContextId, ContextTypeEnum } from '../../types/context';
import { EnvironmentId } from '../../types/environment';
import { OrganizationId } from '../../types/organization';

export interface IContext {
  _id: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;

  identifier: ContextId;
  type: ContextTypeEnum;
  data: ContextData;

  createdAt: string;
  updatedAt: string;
}

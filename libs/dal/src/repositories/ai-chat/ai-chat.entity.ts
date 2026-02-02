import { AiResourceTypeEnum } from '@novu/shared';
import type { ChangePropsValueType } from '../../types/helpers';
import type { EnvironmentId } from '../environment';
import type { OrganizationId } from '../organization';

export class AiChatEntity {
  _id: string;
  _organizationId: OrganizationId;
  _environmentId: EnvironmentId;
  _userId: string;

  resourceType: AiResourceTypeEnum;
  resourceId?: string;

  messages: unknown[];
  activeStreamId?: string | null;

  createdAt: string;
  updatedAt: string;
}

export type AiChatDBModel = ChangePropsValueType<AiChatEntity, '_environmentId' | '_organizationId'>;

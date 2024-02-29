import { EnvironmentId, ITemplateVariable, OrganizationId, TemplateVariableTypeEnum } from '@novu/shared';

import type { ChangePropsValueType } from '../../types';
import { NotificationTemplateId } from '../notification-template';
import { IWebhookTemplateVariable } from './types';

export class WebhookTriggerEntity {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _creatorId: string;

  _templateId: NotificationTemplateId;

  name: string;

  description: string;

  active: boolean;

  token: string;

  variables?: IWebhookTemplateVariable[];
}

export type WebhookTriggerDBModel = ChangePropsValueType<
  WebhookTriggerEntity,
  '_environmentId' | '_organizationId' | '_creatorId' | '_templateId'
>;

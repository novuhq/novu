import { StepTypeEnum, IMessageCTA, IActor } from '@novu/shared';

import { IEmailBlock, ITemplateVariable } from './types';
import type { OrganizationId } from '../organization';
import type { EnvironmentId } from '../environment';
import type { IEntity, TransformEntityToDbModel } from '../../types';

export class MessageTemplateEntity implements IEntity {
  _id: string;

  _environmentId: EnvironmentId;

  _organizationId: OrganizationId;

  _creatorId: string;

  // TODO: Due a circular dependency I can't import LayoutId from Layout.
  _layoutId: string | null;

  type: StepTypeEnum;

  variables?: ITemplateVariable[];

  content: string | IEmailBlock[];

  contentType?: 'editor' | 'customHtml';

  active?: boolean;

  subject?: string;

  title?: string;

  name?: string;

  preheader?: string;

  senderName?: string;

  _feedId?: string;

  cta?: IMessageCTA;

  _parentId?: string;

  actor?: IActor;

  deleted?: boolean;
}

export type MessageTemplateDBModel = TransformEntityToDbModel<MessageTemplateEntity>;

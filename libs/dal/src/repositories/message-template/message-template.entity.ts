import { StepTypeEnum, IMessageCTA, TemplateVariableTypeEnum, IActor } from '@novu/shared';

import { IEmailBlock, ITemplateVariable } from './types';

export class MessageTemplateEntity {
  _id: string;

  _environmentId: string;

  _organizationId: string;

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
}

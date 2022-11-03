import { StepTypeEnum, IMessageCTA, TemplateVariableTypeEnum, IAvatarDetails } from '@novu/shared';

export class MessageTemplateEntity {
  _id?: string;

  _environmentId: string;

  _organizationId: string;

  _creatorId: string;

  type: StepTypeEnum;

  variables?: ITemplateVariable[];

  content: string | IEmailBlock[];

  contentType?: 'editor' | 'customHtml';

  active?: boolean;

  subject?: string;

  title?: string;

  name?: string;

  _feedId?: string;

  cta?: IMessageCTA;

  _parentId?: string;

  avatarDetails?: IAvatarDetails;
}

export class IEmailBlock {
  type: 'button' | 'text';

  content: string;

  url?: string;

  styles?: {
    textAlign?: 'left' | 'right' | 'center';
  };
}

export class ITemplateVariable {
  type: TemplateVariableTypeEnum;

  name: string;

  required: boolean;

  defaultValue?: string | boolean;
}

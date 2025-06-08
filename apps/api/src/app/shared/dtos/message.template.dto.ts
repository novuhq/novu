import {
  ActorTypeEnum,
  IEmailBlock,
  IMessageCTADto,
  ITemplateVariable,
  MessageTemplateContentType,
  StepTypeEnum,
} from '@novu/shared';

export class MessageTemplateDto {
  type: StepTypeEnum;

  content: string | IEmailBlock[];

  contentType?: MessageTemplateContentType;

  cta?: IMessageCTADto;

  actor?: {
    type: ActorTypeEnum;
    data: string | null;
  };

  variables?: ITemplateVariable[];

  _feedId?: string;

  _layoutId?: string | null;

  name?: string;

  subject?: string;

  title?: string;

  preheader?: string;

  senderName?: string;

  _creatorId?: string;
}

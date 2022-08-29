import { ChannelCTATypeEnum, StepTypeEnum } from './channel.enum';

export interface IEmailBlock {
  type: 'text' | 'button';
  content: string;
  url?: string;
  styles?: {
    textAlign?: 'left' | 'right' | 'center';
  };
}

export class ITemplateVariable {
  type: 'String' | 'Array' | 'Boolean';
  name: string;
  required: boolean;
  defaultValue?: string | boolean;
}

export interface IMessageTemplate {
  _id?: string;
  subject?: string;
  name?: string;
  type: StepTypeEnum;
  contentType?: 'editor' | 'customHtml';
  content: string | IEmailBlock[];
  variables?: ITemplateVariable[];
  cta?: {
    type: ChannelCTATypeEnum;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: any;
  };
  _feedId?: string;
  active?: boolean;
}

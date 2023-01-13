import { EmailBlockTypeEnum, TemplateVariableTypeEnum, TextAlignEnum } from '@novu/shared';

export interface IEmailBlock {
  type: EmailBlockTypeEnum;
  content: string;
  url?: string;
  styles?: {
    textAlign?: TextAlignEnum;
  };
}

export interface ITemplateVariable {
  type: TemplateVariableTypeEnum;
  name: string;
  required: boolean;
  defaultValue?: string | boolean;
}

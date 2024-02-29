import { TemplateVariableTypeEnum } from '@novu/shared';

export interface IWebhookTemplateVariable {
  type: TemplateVariableTypeEnum;
  name: string;
  required?: boolean;
  value?: string | boolean;
}

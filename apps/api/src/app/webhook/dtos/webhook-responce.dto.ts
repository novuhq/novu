import { IsDefined, IsString, IsOptional, IsBoolean } from 'class-validator';
import { IWebhookTemplateVariable } from '@novu/dal/src/repositories/webhook-trigger/types';

export class WebhookResponseDto {
  @IsDefined()
  @IsString()
  webhookId: string;

  @IsDefined()
  @IsString()
  environmentId: string;

  @IsDefined()
  @IsString()
  organizationId: string;

  @IsDefined()
  @IsString()
  templateId: string;

  @IsDefined()
  @IsString()
  name: string;

  @IsDefined()
  @IsString()
  description: string;

  @IsDefined()
  @IsBoolean()
  active: boolean;

  @IsDefined()
  subscribers: string[];

  @IsOptional()
  variables: IWebhookTemplateVariable | undefined;
}

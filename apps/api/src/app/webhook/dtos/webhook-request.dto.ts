import { BaseCommand } from '../../shared/commands/base.command';
import { IsDefined, IsOptional } from 'class-validator';
import { IWebhookTemplateVariable } from '@novu/dal/src/repositories/webhook-trigger/types';

export class SpecificWebhookCommand extends BaseCommand {
  @IsDefined()
  webhookId: string;
}

export class ListWebhookCommand extends BaseCommand {
  @IsDefined()
  environmentId: string;

  @IsOptional()
  notificationTemplateId: string | null;
}

export class UpdateWebhookCommand extends BaseCommand {
  @IsDefined()
  webhookId: string;

  name?: string;

  description?: string;

  active?: boolean;

  variables?: IWebhookTemplateVariable[];
}

export class CreateWebhookCommand extends BaseCommand {
  @IsDefined()
  webhookId: string;

  environmentId: string;

  organizationId: string;

  templateId: string;

  name: string;

  description: string;

  active?: boolean;

  variables?: IWebhookTemplateVariable[];
}

export interface IUpdateWebhookBody {
  webhookId: string;

  name: string;

  description: string;

  active?: boolean;

  variables?: IWebhookTemplateVariable[];
}

export interface ICreateWebhookBody {
  webhookId: string;

  environmentId: string;

  organizationId: string;

  templateId: string;

  name: string;

  description: string;

  active?: boolean;

  variables?: IWebhookTemplateVariable[];
}

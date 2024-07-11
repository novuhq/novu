import { BaseCommand } from '@novu/application-generic';
import { IsDefined } from 'class-validator';

export class ProcessVercelWebhookCommand extends BaseCommand {
  @IsDefined()
  teamId: string;

  @IsDefined()
  projectId: string;

  @IsDefined()
  deploymentUrl: string;

  @IsDefined()
  vercelEnvironment: 'production' | 'preview';

  @IsDefined()
  signatureHeader: string;

  @IsDefined()
  body: any;
}

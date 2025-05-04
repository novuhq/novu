import { IsDefined } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';

export class GetWebhookPortalTokenCommand extends BaseCommand {
  @IsDefined()
  environmentId: string;

  @IsDefined()
  organizationId: string;

  @IsDefined()
  userId: string;
}

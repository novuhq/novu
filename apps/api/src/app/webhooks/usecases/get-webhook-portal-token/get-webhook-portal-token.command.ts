import { IsDefined } from 'class-validator';
import { BaseCommand } from '@novu/application-generic';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class GetWebhookPortalTokenCommand extends EnvironmentCommand {
  @IsDefined()
  userId: string;
}

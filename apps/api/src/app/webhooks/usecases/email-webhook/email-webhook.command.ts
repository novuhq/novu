import { IsDefined } from 'class-validator';
import { EnvironmentCommand } from '../../../shared/commands/project.command';

export class EmailWebhookCommand extends EnvironmentCommand {
  @IsDefined()
  providerId: string;

  @IsDefined()
  body: any;
}

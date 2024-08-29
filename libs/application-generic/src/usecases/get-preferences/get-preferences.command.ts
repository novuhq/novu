import { EnvironmentCommand } from '../../commands';

export class GetPreferencesCommand extends EnvironmentCommand {
  readonly subscriberId: string;

  readonly templateId: string;
}

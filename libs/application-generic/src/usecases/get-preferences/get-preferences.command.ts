import { EnvironmentCommand } from '../../commands';

export class GetPreferencesCommand extends EnvironmentCommand {
  subscriberId?: string;
  templateId?: string;
}

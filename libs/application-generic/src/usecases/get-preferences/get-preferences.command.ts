import { EnvironmentCommand } from '../../commands';

export class GetPreferencesCommand extends EnvironmentCommand {
  // todo: the usecase uses this field as _subscriberId nv-6940
  // refactor-rename-subscriberId to _subscriberId
  subscriberId?: string;
  templateId?: string;
}

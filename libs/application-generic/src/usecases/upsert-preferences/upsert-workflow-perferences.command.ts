import { DiscoverWorkflowOutputPreferences } from '@novu/framework';
import { EnvironmentCommand } from '../../commands';
import { IsDefined, IsNotEmpty } from 'class-validator';

export class UpsertWorkflowPerferencesCommand extends EnvironmentCommand {
  @IsDefined()
  readonly preferences: DiscoverWorkflowOutputPreferences;

  @IsNotEmpty()
  templateId: string;
}

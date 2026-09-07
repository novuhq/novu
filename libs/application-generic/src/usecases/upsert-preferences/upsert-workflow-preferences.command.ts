import { IsMongoId, IsNotEmpty } from 'class-validator';
import { UpsertPreferencesRequiredBaseCommand } from './upsert-preferences.command';

export class UpsertWorkflowPreferencesCommand extends UpsertPreferencesRequiredBaseCommand {
  @IsNotEmpty()
  @IsMongoId()
  readonly templateId: string;
}

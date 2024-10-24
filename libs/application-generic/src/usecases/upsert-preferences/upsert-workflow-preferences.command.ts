import { IsMongoId, IsNotEmpty } from 'class-validator';
import { UpsertPreferencesBaseCommand } from './upsert-preferences.command';

export class UpsertWorkflowPreferencesCommand extends UpsertPreferencesBaseCommand {
  @IsNotEmpty()
  @IsMongoId()
  readonly templateId: string;
}

import { IsMongoId, IsNotEmpty } from 'class-validator';
import { UpsertSubscriberGlobalPreferencesCommand } from './upsert-subscriber-global-preferences.command';

export class UpsertSubscriberWorkflowPreferencesCommand extends UpsertSubscriberGlobalPreferencesCommand {
  @IsNotEmpty()
  @IsMongoId()
  readonly templateId: string;
}

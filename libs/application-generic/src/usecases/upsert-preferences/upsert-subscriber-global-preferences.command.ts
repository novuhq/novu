import { IsMongoId, IsNotEmpty } from 'class-validator';
import { UpsertPreferencesBaseCommand } from './upsert-preferences.command';

export class UpsertSubscriberGlobalPreferencesCommand extends UpsertPreferencesBaseCommand {
  @IsNotEmpty()
  @IsMongoId()
  readonly _subscriberId: string;
}

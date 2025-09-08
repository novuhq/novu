import { Schedule } from '@novu/shared';
import { IsBoolean, IsMongoId, IsNotEmpty, IsOptional } from 'class-validator';
import { UpsertPreferencesPartialBaseCommand } from './upsert-preferences.command';

export class UpsertSubscriberGlobalPreferencesCommand extends UpsertPreferencesPartialBaseCommand {
  @IsNotEmpty()
  @IsMongoId()
  readonly _subscriberId: string;

  @IsOptional()
  @IsBoolean()
  readonly returnPreference?: boolean = true;

  @IsOptional()
  readonly schedule?: Schedule;
}

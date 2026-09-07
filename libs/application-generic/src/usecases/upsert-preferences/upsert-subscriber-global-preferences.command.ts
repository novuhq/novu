import { Schedule } from '@novu/shared';
import { IsArray, IsBoolean, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly contextKeys?: string[];
}

import {
  IsEnum,
  IsBoolean,
  IsOptional,
  IsObject,
  ValidateNested,
  IsNotEmpty,
  IsMongoId,
  ValidateIf,
} from 'class-validator';
import {
  ChannelPreference as ChannelPreferenceType,
  PreferencesTypeEnum,
  WorkflowPreferencesPartial,
  WorkflowPreference as WorkflowPreferenceType,
  ChannelTypeEnum,
} from '@novu/shared';
import { Type } from 'class-transformer';
import { EnvironmentCommand } from '../../commands';

class WorkflowPreference implements Partial<WorkflowPreferenceType> {
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly readOnly?: boolean;
}

export class ChannelPreference implements Partial<ChannelPreferenceType> {
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;
}

class ChannelPreferences
  implements Partial<Record<ChannelTypeEnum, ChannelPreference>>
{
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreference)
  readonly email?: ChannelPreference;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreference)
  readonly sms?: ChannelPreference;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreference)
  readonly in_app?: ChannelPreference;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreference)
  readonly push?: ChannelPreference;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreference)
  readonly chat?: ChannelPreference;
}

export class Preferences implements WorkflowPreferencesPartial {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowPreference)
  readonly all?: WorkflowPreference;

  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferences)
  readonly channels?: ChannelPreferences;
}

export class UpsertPreferencesBaseCommand extends EnvironmentCommand {
  @IsObject()
  @ValidateNested()
  @Type(() => Preferences)
  @ValidateIf((object, value) => value !== null)
  readonly preferences: Preferences | null;
}

export class UpsertPreferencesCommand extends UpsertPreferencesBaseCommand {
  @IsOptional()
  @IsMongoId()
  readonly _subscriberId?: string;

  @IsOptional()
  @IsMongoId()
  readonly userId?: string;

  @IsOptional()
  @IsMongoId()
  readonly templateId?: string;

  @IsNotEmpty()
  @IsEnum(PreferencesTypeEnum)
  readonly type: PreferencesTypeEnum;
}

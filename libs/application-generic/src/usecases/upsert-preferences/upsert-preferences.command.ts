import {
  ChannelPreference as ChannelPreferenceType,
  ChannelTypeEnum,
  WorkflowPreferences,
  WorkflowPreferencesPartial,
  WorkflowPreference as WorkflowPreferenceType,
} from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsObject, IsOptional, ValidateIf, ValidateNested } from 'class-validator';
import { EnvironmentCommand } from '../../commands';

// PARTIAL PREFERENCES
export class WorkflowPreferencePartial implements Partial<WorkflowPreferenceType> {
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  readonly readOnly?: boolean;
}

export class ChannelPreferencePartial implements Partial<ChannelPreferenceType> {
  @IsOptional()
  @IsBoolean()
  readonly enabled?: boolean;
}

export class ChannelPreferencesPartial implements Partial<Record<ChannelTypeEnum, ChannelPreferencePartial>> {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferencePartial)
  readonly email?: ChannelPreferencePartial;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferencePartial)
  readonly sms?: ChannelPreferencePartial;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferencePartial)
  readonly in_app?: ChannelPreferencePartial;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferencePartial)
  readonly push?: ChannelPreferencePartial;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferencePartial)
  readonly chat?: ChannelPreferencePartial;
}

export class PreferencesPartial implements WorkflowPreferencesPartial {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowPreferencePartial)
  readonly all?: WorkflowPreferencePartial;

  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferencesPartial)
  readonly channels?: ChannelPreferencesPartial;
}

export class UpsertPreferencesPartialBaseCommand extends EnvironmentCommand {
  @IsObject()
  @ValidateNested()
  @Type(() => PreferencesPartial)
  readonly preferences: PreferencesPartial;
}

// FULL PREFERENCES
export class WorkflowPreferenceRequired implements WorkflowPreferenceType {
  @IsBoolean()
  readonly enabled: boolean;

  @IsBoolean()
  readonly readOnly: boolean;
}

export class ChannelPreferenceRequired implements ChannelPreferenceType {
  @IsBoolean()
  readonly enabled: boolean;
}

export class ChannelPreferencesRequired implements Record<ChannelTypeEnum, ChannelPreferenceRequired> {
  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferenceRequired)
  readonly email: ChannelPreferenceRequired;

  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferenceRequired)
  readonly sms: ChannelPreferenceRequired;

  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferenceRequired)
  readonly in_app: ChannelPreferenceRequired;

  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferenceRequired)
  readonly push: ChannelPreferenceRequired;

  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferenceRequired)
  readonly chat: ChannelPreferenceRequired;
}

export class PreferencesRequired implements WorkflowPreferences {
  @IsObject()
  @ValidateNested()
  @Type(() => WorkflowPreferenceRequired)
  readonly all: WorkflowPreferenceRequired;

  @IsObject()
  @ValidateNested()
  @Type(() => ChannelPreferencesRequired)
  readonly channels: ChannelPreferencesRequired;
}

export class UpsertPreferencesRequiredBaseCommand extends EnvironmentCommand {
  @IsObject()
  @ValidateNested()
  @Type(() => PreferencesRequired)
  readonly preferences: PreferencesRequired;
}

import { IPreferenceChannels, IPreferenceOverride, IWorkflow, PreferenceLevelEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional } from 'class-validator';

export class GetPreferencesResponseDto {
  @IsDefined()
  @IsEnum({
    enum: PreferenceLevelEnum,
  })
  level: PreferenceLevelEnum;

  @IsOptional()
  workflow?: IWorkflow;

  @IsDefined()
  enabled: boolean;

  @IsDefined()
  channels: IPreferenceChannels;

  @IsOptional()
  overrides?: IPreferenceOverride[];
}

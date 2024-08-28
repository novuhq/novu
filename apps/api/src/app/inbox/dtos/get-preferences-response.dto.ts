import { IPreferenceChannels, PreferenceLevelEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional } from 'class-validator';
import type { Workflow } from '../utils/types';

export class GetPreferencesResponseDto {
  @IsDefined()
  @IsEnum({
    enum: PreferenceLevelEnum,
  })
  level: PreferenceLevelEnum;

  @IsOptional()
  workflow?: Workflow;

  @IsDefined()
  enabled: boolean;

  @IsDefined()
  channels: IPreferenceChannels;
}

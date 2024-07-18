import { IPreferenceChannels, IPreferenceOverride, ITemplateConfiguration, PreferenceLevelEnum } from '@novu/shared';
import { IsDefined, IsEnum, IsOptional } from 'class-validator';

export class GetPreferencesResponseDto {
  @IsDefined()
  @IsEnum({
    enum: PreferenceLevelEnum,
  })
  level: PreferenceLevelEnum;

  @IsOptional()
  workflow?: ITemplateConfiguration;

  @IsDefined()
  preferences: { enabled: boolean; channels: IPreferenceChannels; overrides?: IPreferenceOverride[] };
}

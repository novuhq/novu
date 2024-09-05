import { ChannelTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, ValidateNested } from 'class-validator';

export class Preference {
  @IsBoolean()
  defaultValue: boolean;

  @IsBoolean()
  readOnly: boolean;
}

export class Channels {
  @ValidateNested({ each: true })
  @Type(() => Preference)
  [ChannelTypeEnum.IN_APP]: Preference;

  @ValidateNested({ each: true })
  @Type(() => Preference)
  [ChannelTypeEnum.EMAIL]: Preference;

  @ValidateNested({ each: true })
  @Type(() => Preference)
  [ChannelTypeEnum.SMS]: Preference;

  @ValidateNested({ each: true })
  @Type(() => Preference)
  [ChannelTypeEnum.CHAT]: Preference;

  @ValidateNested({ each: true })
  @Type(() => Preference)
  [ChannelTypeEnum.PUSH]: Preference;
}

export class PreferencesDto {
  @ValidateNested({ each: true })
  @Type(() => Preference)
  workflow: Preference;

  @ValidateNested({ each: true })
  @Type(() => Channels)
  channels: Channels;
}

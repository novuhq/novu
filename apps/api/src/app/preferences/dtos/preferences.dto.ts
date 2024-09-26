import { ChannelTypeEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, ValidateNested } from 'class-validator';

export class WorkflowPreference {
  @IsBoolean()
  enabled: boolean;

  @IsBoolean()
  readOnly: boolean;
}

export class ChannelPreference {
  @IsBoolean()
  enabled: boolean;
}

export class Channels {
  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.IN_APP]: ChannelPreference;

  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.EMAIL]: ChannelPreference;

  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.SMS]: ChannelPreference;

  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.CHAT]: ChannelPreference;

  @ValidateNested({ each: true })
  @Type(() => ChannelPreference)
  [ChannelTypeEnum.PUSH]: ChannelPreference;
}

export class PreferencesDto {
  @ValidateNested({ each: true })
  @Type(() => WorkflowPreference)
  workflow: WorkflowPreference;

  @ValidateNested({ each: true })
  @Type(() => Channels)
  channels: Channels;
}

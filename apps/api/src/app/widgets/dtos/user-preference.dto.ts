import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { ChannelTypeEnum } from '@novu/shared';

export class UpdateSubscriberPreferenceBodyDto {
  @ValidateNested()
  channel?: IChannelPreference;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

export interface IChannelPreference {
  type: ChannelTypeEnum;

  enabled: boolean;
}

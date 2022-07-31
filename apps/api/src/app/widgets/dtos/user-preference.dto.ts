import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { ChannelTypeEnum } from '@novu/stateless';

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

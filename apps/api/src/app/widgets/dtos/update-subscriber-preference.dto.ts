import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { IUpdateSubscriberPreferenceDto, IChannelPreference } from '@novu/shared';

export class UpdateSubscriberPreferenceDto implements IUpdateSubscriberPreferenceDto {
  @ValidateNested()
  channel?: IChannelPreference;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

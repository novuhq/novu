import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';
import { ChannelPreference } from './update-subscriber-preference-request.dto';

export class UpdateSubscriberPreferenceDto {
  @ValidateNested()
  channel?: ChannelPreference;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;
}

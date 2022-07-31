import { IsBoolean, IsDefined, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ChannelTypeEnum } from '@novu/stateless';

export class UpdateSubscriberPreferenceBodyDto {
  @IsDefined()
  @IsNotEmpty()
  @IsString()
  templateId: string;

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

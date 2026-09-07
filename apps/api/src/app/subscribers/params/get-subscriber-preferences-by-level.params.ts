import { PreferenceLevelEnum } from '@novu/shared';
import { IsEnum, IsString } from 'class-validator';

export class GetSubscriberPreferencesByLevelParams {
  @IsEnum(PreferenceLevelEnum)
  parameter: PreferenceLevelEnum;

  @IsString()
  subscriberId: string;
}

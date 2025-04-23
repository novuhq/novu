import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, ValidateNested } from 'class-validator';
import { SubscriberPreferenceChannels } from '../../shared/dtos/preference-channels';

export class SubscriberGlobalPreferenceDto {
  @ApiProperty({ description: 'Whether notifications are enabled globally' })
  @IsBoolean({ message: 'Enabled must be a boolean value' })
  @IsNotEmpty({ message: 'Enabled status is required' })
  enabled: boolean;

  @ApiProperty({ description: 'Channel-specific preference settings', type: SubscriberPreferenceChannels })
  @ValidateNested()
  @Type(() => SubscriberPreferenceChannels)
  channels: SubscriberPreferenceChannels;
}

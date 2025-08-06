import { ApiPropertyOptional } from '@nestjs/swagger';
import { IUpdateWorkflowOverrideRequestDto } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsOptional, ValidateNested } from 'class-validator';

import { SubscriberPreferenceChannels } from '../../shared/dtos/preference-channels';

export class UpdateWorkflowOverrideRequestDto implements IUpdateWorkflowOverrideRequestDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    type: SubscriberPreferenceChannels,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriberPreferenceChannels)
  preferenceSettings?: SubscriberPreferenceChannels;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

import { IUpdateWorkflowOverrideRequestDto } from '@novu/shared';

import { PreferenceChannels } from '../../shared/dtos/preference-channels';

export class UpdateWorkflowOverrideRequestDto implements IUpdateWorkflowOverrideRequestDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  active?: boolean;

  @ApiPropertyOptional({
    type: PreferenceChannels,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PreferenceChannels)
  preferenceSettings?: PreferenceChannels;
}

import { IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

import { ICreateWorkflowOverrideRequestDto } from '@novu/shared';

import { PreferenceChannels } from '../../shared/dtos/preference-channels';

export class CreateWorkflowOverrideRequestDto implements ICreateWorkflowOverrideRequestDto {
  @ApiProperty()
  @IsString()
  @IsDefined()
  workflowId: string;

  @ApiProperty()
  @IsString()
  @IsDefined()
  tenantId: string;

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

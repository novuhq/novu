import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ICreateWorkflowOverrideRequestDto } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsBoolean, IsDefined, IsOptional, IsString, ValidateNested } from 'class-validator';

import { SubscriberPreferenceChannels } from '../../shared/dtos/preference-channels';

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
    type: SubscriberPreferenceChannels,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => SubscriberPreferenceChannels)
  preferenceSettings?: SubscriberPreferenceChannels;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { WorkflowPreferencesDto } from './workflow-preferences.dto';

export class WorkflowPreferencesResponseDto {
  @ApiPropertyOptional({
    description: 'User-specific workflow preferences',
    type: () => WorkflowPreferencesDto,
    nullable: true,
  })
  @ValidateNested()
  @Type(() => WorkflowPreferencesDto)
  user: WorkflowPreferencesDto | null;

  @ApiProperty({
    description: 'Default workflow preferences',
    type: () => WorkflowPreferencesDto,
  })
  @ValidateNested()
  @Type(() => WorkflowPreferencesDto)
  default: WorkflowPreferencesDto;
}

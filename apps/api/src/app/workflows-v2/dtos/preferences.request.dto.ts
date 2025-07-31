import { ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsOptional, ValidateNested } from 'class-validator';
import { WorkflowPreferencesDto } from './workflow-preferences.dto';

export class PreferencesRequestDto {
  @ApiPropertyOptional({
    description: 'User workflow preferences',
    oneOf: [{ $ref: getSchemaPath(WorkflowPreferencesDto) }],
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowPreferencesDto)
  user: WorkflowPreferencesDto | null;

  @ApiPropertyOptional({
    description: 'Workflow-specific preferences',
    type: () => WorkflowPreferencesDto,
    nullable: true,
    required: false,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => WorkflowPreferencesDto)
  workflow?: WorkflowPreferencesDto | null;
}

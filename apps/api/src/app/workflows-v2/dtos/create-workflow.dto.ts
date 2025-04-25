import { ApiExtraModels, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowCreationSourceEnum } from '@novu/shared';
import { StepUpsertDto } from './create-step.dto';
import { PreferencesRequestDto } from './preferences.request.dto';
import { WorkflowCommonsFields } from './workflow-commons.dto';

@ApiExtraModels(StepUpsertDto)
export class CreateWorkflowDto extends WorkflowCommonsFields {
  @ApiProperty({ description: 'Unique identifier for the workflow' })
  @IsString()
  workflowId: string;

  @ApiProperty({
    description: 'Steps of the workflow',
    type: StepUpsertDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepUpsertDto)
  steps: StepUpsertDto[];

  @ApiProperty({
    description: 'Source of workflow creation',
    enum: WorkflowCreationSourceEnum,
    enumName: 'WorkflowCreationSourceEnum',
  })
  @IsEnum(WorkflowCreationSourceEnum)
  __source: WorkflowCreationSourceEnum;

  @ApiPropertyOptional({
    description: 'Workflow preferences',
    type: PreferencesRequestDto,
    required: false,
  })
  @IsOptional()
  @Type(() => PreferencesRequestDto)
  preferences?: PreferencesRequestDto;
}

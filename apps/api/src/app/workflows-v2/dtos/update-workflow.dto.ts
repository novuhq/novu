import { ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { WorkflowOriginEnum } from '@novu/shared';
import { WorkflowCommonsFields } from './workflow-commons.dto';
import { PreferencesRequestDto } from './preferences.request.dto';
import { StepUpsertDto } from './create-step.dto';

export class UpdateWorkflowDto extends WorkflowCommonsFields {
  @ApiPropertyOptional({
    description: 'Workflow ID (allowed only for code-first workflows)',
    type: 'string',
  })
  @IsOptional()
  workflowId?: string;

  @ApiProperty({
    description: 'Steps of the workflow',
    type: 'array',
    items: {
      $ref: getSchemaPath(StepUpsertDto),
    },
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StepUpsertDto)
  steps: StepUpsertDto[];

  @ApiProperty({
    description: 'Workflow preferences',
    type: () => PreferencesRequestDto,
  })
  @ValidateNested()
  @Type(() => PreferencesRequestDto)
  preferences: PreferencesRequestDto;

  @ApiProperty({
    description: 'Origin of the workflow',
    enum: [...Object.values(WorkflowOriginEnum)],
    enumName: 'WorkflowOriginEnum',
  })
  @IsEnum(WorkflowOriginEnum)
  origin: WorkflowOriginEnum;
}

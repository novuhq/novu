import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateWorkflowDto, Slug, UpdateWorkflowDto, WorkflowOriginEnum, WorkflowStatusEnum } from '@novu/shared';
import { WorkflowCommonsFields } from './workflow-commons.dto';
import { StepResponseDto } from './step.response.dto';
import { WorkflowPreferencesResponseDto } from './preferences.response.dto';
import { RuntimeIssueDto } from './runtime-issue.dto';

@ApiExtraModels(RuntimeIssueDto)
export class WorkflowResponseDto extends WorkflowCommonsFields {
  @ApiProperty({ description: 'Unique identifier of the workflow' })
  @IsString()
  _id: string;

  @ApiProperty({ description: 'Workflow identifier' })
  @IsString()
  workflowId: string;

  @ApiProperty({ description: 'Slug of the workflow' })
  @IsString()
  slug: Slug;

  @ApiProperty({ description: 'Last updated timestamp' })
  @IsString()
  updatedAt: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({
    description: 'Steps of the workflow',
    type: StepResponseDto,
    isArray: true,
  })
  @ValidateNested({ each: true })
  @Type(() => StepResponseDto)
  steps: StepResponseDto[];

  @ApiProperty({
    description: 'Origin of the workflow',
    enum: [...Object.values(WorkflowOriginEnum)],
    enumName: 'WorkflowOriginEnum',
  })
  @IsEnum(WorkflowOriginEnum)
  origin: WorkflowOriginEnum;

  @ApiProperty({
    description: 'Preferences for the workflow',
    type: () => WorkflowPreferencesResponseDto,
  })
  @ValidateNested()
  @Type(() => WorkflowPreferencesResponseDto)
  preferences: WorkflowPreferencesResponseDto;

  @ApiProperty({
    description: 'Status of the workflow',
    enum: [...Object.values(WorkflowStatusEnum)],
    enumName: 'WorkflowStatusEnum',
  })
  @IsEnum(WorkflowStatusEnum)
  status: WorkflowStatusEnum;

  @ApiPropertyOptional({
    description: 'Runtime issues for workflow creation and update',
    type: 'object',
    additionalProperties: {
      $ref: getSchemaPath(RuntimeIssueDto),
    },
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => RuntimeIssueDto)
  issues?: Record<WorkflowCreateAndUpdateKeys, RuntimeIssueDto>;

  @ApiPropertyOptional({
    description: 'Timestamp of the last workflow trigger',
    type: 'string',
    nullable: true,
  })
  @IsOptional()
  @IsString()
  lastTriggeredAt?: string;

  @ApiPropertyOptional({
    description: 'The payload JSON Schema for the workflow',
    type: 'object',
    nullable: true,
  })
  @IsOptional()
  payloadSchema?: object;

  @ApiPropertyOptional({
    description: 'Generated payload example based on the payload schema',
    type: 'object',
    nullable: true,
  })
  @IsOptional()
  payloadExample?: object;

  @ApiPropertyOptional({
    description: 'Whether payload schema validation is enabled',
    type: 'boolean',
  })
  @IsOptional()
  @IsBoolean()
  validatePayload?: boolean;
}

export type WorkflowCreateAndUpdateKeys = keyof CreateWorkflowDto | keyof UpdateWorkflowDto;

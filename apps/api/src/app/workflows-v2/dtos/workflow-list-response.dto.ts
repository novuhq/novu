import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';
import { StepTypeEnum, WorkflowOriginEnum, WorkflowStatusEnum } from '@novu/shared';
import { WorkflowResponseDto } from './workflow-response.dto';

export class WorkflowListResponseDto {
  @ApiProperty({ description: 'Name of the workflow' })
  @IsString()
  name: string;

  @ApiProperty({
    description: 'Tags associated with the workflow',
    type: 'array',
    items: { type: 'string' },
    required: false,
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiProperty({ description: 'Last updated timestamp' })
  @IsString()
  updatedAt: string;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsString()
  createdAt: string;

  @ApiProperty({ description: 'Unique database identifier' })
  @IsString()
  _id: string;

  @ApiProperty({ description: 'Workflow identifier' })
  @IsString()
  workflowId: string;

  @ApiProperty({ description: 'Workflow slug' })
  @IsString()
  slug: string;

  @ApiProperty({
    description: 'Workflow status',
    enum: [...Object.values(WorkflowStatusEnum)],
    enumName: 'WorkflowStatusEnum',
  })
  status: WorkflowResponseDto['status'];

  @ApiProperty({
    description: 'Workflow origin',
    enum: [...Object.values(WorkflowOriginEnum)],
    enumName: 'WorkflowOriginEnum',
  })
  origin: WorkflowResponseDto['origin'];

  @ApiProperty({
    description: 'Timestamp of the last workflow trigger',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  lastTriggeredAt?: string;

  @ApiProperty({
    description: 'Overview of step types in the workflow',
    type: 'array',
    items: {
      $ref: getSchemaPath('StepTypeEnum'),
    },
  })
  @IsArray()
  @IsEnum(StepTypeEnum, { each: true })
  stepTypeOverviews: StepTypeEnum[];
}

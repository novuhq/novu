import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import { ResourceOriginEnum, StepTypeEnum, WorkflowStatusEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UserResponseDto } from './user-response.dto';
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

  @ApiProperty({
    description: 'User who last updated the workflow',
    type: () => UserResponseDto,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => UserResponseDto)
  updatedBy?: UserResponseDto;

  @ApiProperty({
    description: 'Timestamp of the last workflow publication',
    type: 'string',
    required: false,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  lastPublishedAt?: string;

  @ApiProperty({
    description: 'User who last published the workflow',
    type: () => UserResponseDto,
    required: false,
    nullable: true,
  })
  @IsOptional()
  @Type(() => UserResponseDto)
  lastPublishedBy?: UserResponseDto;

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
    enum: [...Object.values(ResourceOriginEnum)],
    enumName: 'ResourceOriginEnum',
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

  @ApiProperty({
    description: 'Is translation enabled for the workflow',
    type: Boolean,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isTranslationEnabled?: boolean;
}

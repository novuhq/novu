import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepRunStatus } from '@novu/application-generic';
import { ExecutionDetailsStatusEnum } from '@novu/shared';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { DigestMetadataDto } from '../../notifications/dtos/activities-response.dto';

import { GetWorkflowRunResponseBaseDto } from './shared.dto';

export class StepExecutionDetailDto {
  @ApiProperty({ description: 'Unique identifier of the execution detail' })
  @IsString()
  _id: string;

  @ApiPropertyOptional({ description: 'Creation time of the execution detail' })
  @IsOptional()
  @IsString()
  createdAt?: string;

  @ApiProperty({
    enum: [...Object.values(ExecutionDetailsStatusEnum)],
    enumName: 'ExecutionDetailsStatusEnum',
    description: 'Status of the execution detail',
  })
  @IsEnum(ExecutionDetailsStatusEnum)
  status: ExecutionDetailsStatusEnum;

  @ApiProperty({ description: 'Detailed information about the execution' })
  @IsString()
  detail: string;

  @ApiPropertyOptional({ description: 'Provider identifier' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiPropertyOptional({ description: 'Raw data of the execution' })
  @IsOptional()
  @IsString()
  raw?: string | null;
}

export class StepRunDto {
  @ApiProperty({ description: 'Step run identifier' })
  @IsString()
  stepRunId: string;

  @ApiProperty({ description: 'Step identifier' })
  @IsString()
  stepId: string;

  @ApiProperty({ description: 'Step type' })
  @IsString()
  stepType: string;

  @ApiPropertyOptional({ description: 'Provider identifier' })
  @IsOptional()
  @IsString()
  providerId?: string;

  @ApiProperty({
    description: 'Step status',
    enum: ['pending', 'queued', 'running', 'completed', 'failed', 'delayed', 'canceled', 'merged', 'skipped'],
  })
  @IsIn([
    'pending',
    'queued',
    'running',
    'completed',
    'failed',
    'delayed',
    'canceled',
    'merged',
    'skipped',
  ] satisfies StepRunStatus[])
  status: StepRunStatus;

  @ApiProperty({ description: 'Creation timestamp' })
  @IsDate()
  createdAt: Date;

  @ApiProperty({ description: 'Update timestamp' })
  @IsDate()
  updatedAt: Date;

  @ApiProperty({ description: 'Execution details', type: [StepExecutionDetailDto] })
  @Type(() => StepExecutionDetailDto)
  executionDetails: StepExecutionDetailDto[];

  @ApiPropertyOptional({
    description: 'Optional digest for the job, including metadata and events',
    type: DigestMetadataDto,
  })
  digest?: DigestMetadataDto;

  @ApiPropertyOptional({
    description: 'The number of times the digest/delay job has been extended to align with the subscribers schedule',
    type: Number,
  })
  scheduleExtensionsCount?: number;
}

export class GetWorkflowRunResponseDto extends GetWorkflowRunResponseBaseDto {
  @ApiProperty({ description: 'Step runs', type: [StepRunDto] })
  @Type(() => StepRunDto)
  steps: StepRunDto[];

  @ApiProperty({ description: 'Trigger payload' })
  @IsObject()
  payload: Record<string, unknown>;
}

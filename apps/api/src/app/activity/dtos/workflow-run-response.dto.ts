import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepRunStatus } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsDate, IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { DigestMetadataDto } from '../../notifications/dtos/activities-response.dto';
import { GetWorkflowRunResponseBaseDto } from './shared.dto';

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

  @ApiProperty({ description: 'Execution details', type: [Object] })
  executionDetails: any[];

  @ApiPropertyOptional({
    description: 'Optional digest for the job, including metadata and events',
    type: DigestMetadataDto,
  })
  digest?: DigestMetadataDto;
}

export class GetWorkflowRunResponseDto extends GetWorkflowRunResponseBaseDto {
  @ApiProperty({ description: 'Step runs', type: [StepRunDto] })
  @Type(() => StepRunDto)
  steps: StepRunDto[];

  @ApiProperty({ description: 'Trigger payload' })
  @IsObject()
  payload: Record<string, unknown>;
}

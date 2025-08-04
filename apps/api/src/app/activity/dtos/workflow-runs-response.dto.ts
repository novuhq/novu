import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StepRunStatus } from '@novu/application-generic';
import { Type } from 'class-transformer';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { GetWorkflowRunResponseBaseDto } from './shared.dto';

export class WorkflowRunStepsDetailsDto {
  @ApiProperty({ description: 'Step run identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Step identifier' })
  @IsString()
  stepRunId: string;

  @ApiProperty({ description: 'Step type' })
  @IsString()
  stepType: string;

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
}

export class GetWorkflowRunsDto extends GetWorkflowRunResponseBaseDto {
  @ApiProperty({ description: 'Workflow run steps', type: [WorkflowRunStepsDetailsDto] })
  @Type(() => WorkflowRunStepsDetailsDto)
  steps: WorkflowRunStepsDetailsDto[];
}

export class GetWorkflowRunsResponseDto {
  @ApiProperty({ description: 'Workflow runs data', type: [GetWorkflowRunsDto] })
  @Type(() => GetWorkflowRunsDto)
  data: GetWorkflowRunsDto[];

  @ApiPropertyOptional({ description: 'Next cursor for pagination' })
  @IsOptional()
  @IsString()
  next: string | null;

  @ApiPropertyOptional({ description: 'Previous cursor for pagination' })
  @IsOptional()
  @IsString()
  previous: string | null;
}

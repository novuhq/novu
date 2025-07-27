import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import { GetWorkflowRunResponseBaseDto } from './shared.dto';

export class WorkflowRunStepsDetailsDto {
  @ApiProperty({ description: 'Step run identifier' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Step identifier' })
  @IsString()
  stepRunId: string;

  @ApiProperty({ description: 'Step name' })
  @IsString()
  stepName: string;

  @ApiProperty({ description: 'Step status' })
  @IsString()
  status: string;
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

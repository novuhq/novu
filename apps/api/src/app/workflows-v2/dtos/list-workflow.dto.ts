import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsNumber, ValidateNested } from 'class-validator';
import { WorkflowListResponseDto } from './workflow-list-response.dto';

export class ListWorkflowResponse {
  @ApiProperty({
    description: 'List of workflows',
    type: WorkflowListResponseDto,
    isArray: true,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkflowListResponseDto)
  workflows: WorkflowListResponseDto[];

  @ApiProperty({
    description: 'Total number of workflows',
    type: 'number',
  })
  @IsNumber()
  totalCount: number;
}

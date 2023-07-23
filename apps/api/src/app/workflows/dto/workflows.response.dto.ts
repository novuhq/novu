import { ApiProperty } from '@nestjs/swagger';
import { WorkflowResponse } from './workflow-response.dto';

export class WorkflowsResponseDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  data: WorkflowResponse[];

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}

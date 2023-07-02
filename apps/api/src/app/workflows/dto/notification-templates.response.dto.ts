import { ApiProperty } from '@nestjs/swagger';
import { WorkflowsResponse } from './notification-template-response.dto';

export class WorkflowsResponseDto {
  @ApiProperty()
  totalCount: number;

  @ApiProperty()
  data: WorkflowsResponse[];

  @ApiProperty()
  pageSize: number;

  @ApiProperty()
  page: number;
}

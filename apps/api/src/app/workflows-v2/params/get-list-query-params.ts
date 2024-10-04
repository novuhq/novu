import { LimitOffsetPaginationDto, WorkflowResponseDto } from '@novu/shared';

export class GetListQueryParams extends LimitOffsetPaginationDto<WorkflowResponseDto, 'updatedAt'> {
  query?: string;
}

import { LimitOffsetPaginationDto } from '@novu/shared';
import { WorkflowResponseDto } from '@novu/shared-internal';

export class GetListQueryParams extends LimitOffsetPaginationDto<WorkflowResponseDto, 'updatedAt'> {
  query?: string;
}

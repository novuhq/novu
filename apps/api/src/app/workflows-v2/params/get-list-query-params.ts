import { LimitOffsetPaginationDto } from '@novu/shared';

import { WorkflowResponseDto } from '../dto/workflow-response-dto';

export class GetListQueryParams extends LimitOffsetPaginationDto<WorkflowResponseDto, 'updatedAt'> {
  query?: string;
}

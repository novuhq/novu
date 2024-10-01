import { LimitOffsetPaginationDto } from '@novu/shared';

import { WorkflowResponseDto } from '@novu/shared/src/dto/workflows/workflow-response-dto';

export class GetListQueryParams extends LimitOffsetPaginationDto<WorkflowResponseDto, 'updatedAt'> {
  query?: string;
}

import { WorkflowResponseDto } from './workflow-response-dto';
import { LimitOffsetPaginationDto } from '../../types';

export class GetListQueryParams extends LimitOffsetPaginationDto<WorkflowResponseDto, 'updatedAt'> {
  query?: string;
}

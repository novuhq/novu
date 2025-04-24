import { PaginationRequestDto } from '../../shared/dtos/pagination-request';

export class GetWorkflowOverridesRequestDto extends PaginationRequestDto(10, 100) {}

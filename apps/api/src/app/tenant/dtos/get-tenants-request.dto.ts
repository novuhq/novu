import { PaginationRequestDto } from '../../shared/dtos/pagination-request';

const LIMIT = {
  DEFAULT: 10,
  MAX: 100,
};

export class GetTenantsRequestDto extends PaginationRequestDto(LIMIT.DEFAULT, LIMIT.MAX) {}

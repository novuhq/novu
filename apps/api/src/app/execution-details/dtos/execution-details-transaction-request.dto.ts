import { IsDefined, IsNumber } from 'class-validator';
import { PaginationRequestDto } from '../../shared/dtos/pagination-request';

export class GetExecutionDetailsByTransactionRequestDto extends PaginationRequestDto(10, 100) {}

import { PaginationRequestDto } from '../../shared/dtos/pagination-request';

export class NotificationTemplatesRequestDto extends PaginationRequestDto(10, 100) {}

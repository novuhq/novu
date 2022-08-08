import { SubscriberResponseDto } from './subscriber-response.dto';

export class SubscribersResponseDto {
  page: number;
  totalCount: number;
  pageSize: number;
  data: SubscriberResponseDto[];
}

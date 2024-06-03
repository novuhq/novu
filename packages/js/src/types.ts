export interface PaginatedResponse<T = unknown> {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  pageSize: number;
  page: number;
}

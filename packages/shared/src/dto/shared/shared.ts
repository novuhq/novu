export interface ISuccessResponseDto {
  success: boolean;
}

export interface IServerResponse<T> {
  data: T;
}

export interface IPaginatedResponseDto<T> {
  hasMore: boolean;

  page: number;

  pageSize: number;

  data: T[];
}

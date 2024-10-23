export enum DirectionEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}
export interface IResponseError {
  error: string;
  message: string;
  statusCode: number;
}

export interface IPaginatedResponse<T = unknown> {
  data: T[];
  hasMore: boolean;
  totalCount: number;
  pageSize: number;
  page: number;
}

type KeysOfT<T> = keyof T;

export class LimitOffsetPaginationDto<T, K extends KeysOfT<T>> {
  limit: string;
  offset: string;
  orderDirection?: DirectionEnum;
  orderByField?: K;
}

export interface IPaginationParams {
  page: number;
  limit: number;
}

export interface IPaginationWithQueryParams extends IPaginationParams {
  query?: string;
}

export enum OrderDirectionEnum {
  ASC = 1,
  DESC = -1,
}

export enum OrderByEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

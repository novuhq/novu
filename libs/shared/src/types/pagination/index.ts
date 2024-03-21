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

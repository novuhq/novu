type KeysOfT<T> = keyof T;

export class LimitOffsetPaginationDto<T, K extends KeysOfT<T>> {
  limit: string;
  offset: string;
  orderDirection?: DirectionEnum;
  orderByField?: K;
}
export enum DirectionEnum {
  ASC = 'ASC',
  DESC = 'DESC',
}

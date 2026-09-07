import { DirectionEnum } from '../../types';

export class CursorPaginationDto<T, K extends keyof T> {
  limit?: number;
  cursor?: string;
  orderDirection?: DirectionEnum;
  orderBy?: K;
}

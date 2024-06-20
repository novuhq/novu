export type Constructor<I> = new (...args: any[]) => I;

export type CursorPaginationParams = {
  limit: number;
  after: number | string;
};

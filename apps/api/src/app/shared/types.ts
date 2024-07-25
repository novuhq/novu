export type Constructor<I> = new (...args: any[]) => I;

export type CursorPaginationParams = {
  limit: number;
  after?: string;
  offset: number;
};

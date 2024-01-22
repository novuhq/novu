export const PAGINATION_PAGE_SIZES = [10, 25, 50, 100] as const;
export const DEFAULT_PAGE_SIZE: PaginationPageSize = 10;

export type PaginationPageSize = (typeof PAGINATION_PAGE_SIZES)[number];

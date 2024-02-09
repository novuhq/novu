import { createContext } from 'react';

export interface IPaginationContext {
  totalItemCount: number;
  totalPageCount: number;
  /** Note: this is a page *number*, not index */
  currentPageNumber: number;
  pageSize: number;
  onPageChange: (pageNumber: number, shouldSkipPageValidation?: boolean) => void;
}

const DEFAULT_PAGINATION_CONTEXT: IPaginationContext = {
  totalItemCount: 0,
  totalPageCount: 1,
  currentPageNumber: 1,
  pageSize: 10,
  onPageChange: () => {},
};
export const PaginationContext = createContext<IPaginationContext>(DEFAULT_PAGINATION_CONTEXT);

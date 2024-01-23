import { createContext } from 'react';

export interface IPaginationContext {
  totalItemCount: number;
  totalPageCount: number;
  currentPageIndex: number;
  pageSize: number;
  onPageChange: (pageNumber: number) => void;
}

const DEFAULT_PAGINATION_CONTEXT: IPaginationContext = {
  totalItemCount: 0,
  totalPageCount: 1,
  currentPageIndex: 0,
  pageSize: 10,
  onPageChange: () => {},
};
export const PaginationContext = createContext<IPaginationContext>(DEFAULT_PAGINATION_CONTEXT);

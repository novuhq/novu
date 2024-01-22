import { createContext } from 'react';
import { PaginationPageSize } from './Pagination.const';

export interface IPaginationContext {
  totalItemCount: number;
  totalPageCount: number;
  currentPageIndex: number;
  pageSize: PaginationPageSize;
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

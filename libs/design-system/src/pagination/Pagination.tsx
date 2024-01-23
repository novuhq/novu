import { PropsWithChildren } from 'react';
import { IPaginationContext, PaginationContext } from './PaginationContext';

export interface IPaginationProps extends IPaginationContext {
  className?: string;
}

export const Pagination: React.FC<PropsWithChildren<IPaginationProps>> = ({
  currentPageIndex,
  totalPageCount,
  totalItemCount,
  onPageChange,
  pageSize,
  className,
  children,
}) => {
  return (
    <PaginationContext.Provider value={{ currentPageIndex, totalItemCount, onPageChange, totalPageCount, pageSize }}>
      <div className={className}>{children}</div>
    </PaginationContext.Provider>
  );
};

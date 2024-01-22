import { IPaginationContext } from './PaginationContext';

export interface PaginationProps extends IPaginationContext {
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({ currentPageIndex, totalPageCount }) => {
  return (
    <>
      {currentPageIndex + 1} / {totalPageCount} pages
    </>
  );
};

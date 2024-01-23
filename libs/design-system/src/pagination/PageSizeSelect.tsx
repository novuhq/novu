import { ChangeEventHandler } from 'react';
import { DEFAULT_PAGINATION_PAGE_SIZES } from './Pagination.const';

export interface IPageSizeSelectProps {
  onPageSizeChange: (pageSize: number) => void;
  pageSizes?: number[];
}

/**
 * Component for selecting the desired page size for Pagination.
 * @requires this component to be a child of a Pagination component
 */
export const PageSizeSelect: React.FC<IPageSizeSelectProps> = ({
  onPageSizeChange,
  pageSizes = DEFAULT_PAGINATION_PAGE_SIZES,
}) => {
  const handlePageSizeChange: ChangeEventHandler<HTMLSelectElement> = (event) => {
    onPageSizeChange(+event.currentTarget.value);
  };

  return (
    <select onChange={handlePageSizeChange}>
      {pageSizes.map((pageSize) => (
        <option key={`row-settings-${pageSize}`} value={pageSize}>
          {pageSize}
        </option>
      ))}
    </select>
  );
};

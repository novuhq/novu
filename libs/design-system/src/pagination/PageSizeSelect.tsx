import styled from '@emotion/styled';
import { Input } from '@mantine/core';
import { forwardRef, useContext, useMemo } from 'react';
import { ISelectProps, Select } from '../select/Select';
import { DEFAULT_PAGINATION_PAGE_SIZES } from './Pagination.const';
import { PaginationContext } from './PaginationContext';

const InputWrapper = styled(Input.Wrapper)(({ theme }) => {
  return `
  display: flex;
  flex-direction: row;
  align-items: center;
  
  label {
    color: inherit;
    font-size: inherit;
    line-height: inherit;
    text-wrap: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;

    /* TODO: use theme values */
    margin-left: ${'0.5rem'};
  }
`;
});

const StyledSelect = styled(Select)(
  ({ theme }) => `
    max-width: 71px;
    input {
      padding-left: 12px;
      padding-right: 8px;
      margin: 0;
      min-height: inherit;
      /** Explicitly set by designs */
      height: 32px;
      min-width: 44px;
    }

    input:not([type=hidden]) + div {
      /* TODO: use theme values */
      width: 20px;
    }
`
);

export type TPageSizeSelectOption = string;
export interface IPageSizeSelectProps extends Omit<ISelectProps, 'onChange' | 'data'> {
  onPageSizeChange: (pageSize: number) => void;
  pageSizes?: (number | TPageSizeSelectOption)[];
  className?: string;
}

/**
 * Component for selecting the desired page size for Pagination.
 * @requires this component to be a child of a Pagination component
 */
export const PageSizeSelect: React.FC<IPageSizeSelectProps> = forwardRef<HTMLInputElement, IPageSizeSelectProps>(
  ({ onPageSizeChange, pageSizes = DEFAULT_PAGINATION_PAGE_SIZES, ...selectProps }, selectRef) => {
    const { pageSize } = useContext(PaginationContext);

    const handlePageSizeChange = (val: string | string[]) => {
      onPageSizeChange(+val);
    };

    const options = useMemo(() => pageSizes.map((val) => `${val}`), [pageSizes]);

    return (
      <InputWrapper label={'rows per page'} id="pageSizeSelect" inputWrapperOrder={['input', 'label']}>
        <StyledSelect
          ref={selectRef}
          data={options}
          onChange={handlePageSizeChange}
          value={`${pageSize}`}
          className={selectProps.className}
        />
      </InputWrapper>
    );
  }
);

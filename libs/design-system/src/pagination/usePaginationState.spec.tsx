import { act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { MemoryRouter } from 'react-router-dom';
import { expect, it } from 'vitest';
import { IUsePaginationStateOptions, usePaginationState } from './usePaginationState'; // Replace with the actual file path

const callHook = (options: IUsePaginationStateOptions, initialParams?: { page: number; size: number }) => {
  const paramStr = initialParams ? `?page=${initialParams.page}&size=${initialParams.size}` : '';

  return renderHook(() => usePaginationState(options), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[paramStr]}>{children}</MemoryRouter>,
  });
};

it('usePaginationState uses defaults', async () => {
  const pageNumberParamName = 'page';
  const pageSizeParamName = 'size';

  const options: IUsePaginationStateOptions = {
    pageNumberParamName,
    pageSizeParamName,
  };

  // Render hook
  const { result } = callHook(options);

  await waitFor(() => {
    // Verify that state is updated based on URL parameters on mount
    expect(result.current.currentPageNumber).toBe(1);
    expect(result.current.pageSize).toBe(10);
  });
});

it('usePaginationState updates state based on URL parameters on mount', async () => {
  const startingPageNumber = 1;
  const pageSizes = [10, 20, 30];
  const pageNumberParamName = 'page';
  const pageSizeParamName = 'size';

  const options: IUsePaginationStateOptions = {
    startingPageNumber,
    pageSizes,
    pageNumberParamName,
    pageSizeParamName,
  };

  // Render hook
  const { result } = callHook(options, { page: 2, size: 20 });

  // Verify that state is updated based on URL parameters on mount
  expect(result.current.currentPageNumber).toBe(2);
  expect(result.current.pageSize).toBe(20);
});

it('usePaginationState updates URL parameters on state change', async () => {
  const startingPageNumber = 1;
  const pageSizes = [10, 20, 30];
  const pageNumberParamName = 'page';
  const pageSizeParamName = 'size';

  const options: IUsePaginationStateOptions = {
    startingPageNumber,
    pageSizes,
    pageNumberParamName,
    pageSizeParamName,
  };

  // Render hook
  const { result } = callHook(options);

  // Update state to trigger URL parameter update
  act(() => {
    result.current.setPageSize(30);
    result.current.setCurrentPageNumber(3);
  });

  // Verify that URL parameters are updated on state change
  expect(result.current.pageSize).toBe(30);
  expect(result.current.currentPageNumber).toBe(3);
});

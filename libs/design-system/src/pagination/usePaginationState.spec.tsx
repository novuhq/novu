import { act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import * as ReactRouterDOM from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { IUsePaginationStateOptions, usePaginationState } from './usePaginationState'; // Replace with the actual file path

const startingPageNumber = 1;
const pageSizes = [10, 20, 30];
const pageNumberParamName = 'page';
const pageSizeParamName = 'size';

const callHook = (options: IUsePaginationStateOptions, initialParams?: { page: number; size: number }) => {
  const paramStr = initialParams ? `?page=${initialParams.page}&size=${initialParams.size}` : '';

  return renderHook(() => usePaginationState(options), {
    wrapper: ({ children }) => <MemoryRouter initialEntries={[paramStr]}>{children}</MemoryRouter>,
  });
};

const setSearchParams = vi.fn();

const mockUseSearchParams = (): ReturnType<typeof useSearchParams> => {
  const params = new URLSearchParams();

  return [params, setSearchParams];
};

vi.spyOn(ReactRouterDOM, 'useSearchParams').mockImplementation(mockUseSearchParams);

afterEach(() => {
  vi.clearAllMocks();
});

it('usePaginationState uses defaults', async () => {
  const page = startingPageNumber;
  const size = pageSizes[0];
  const options: IUsePaginationStateOptions = {
    pageNumberParamName,
    pageSizeParamName,
  };

  // Render hook
  const { result } = callHook(options);

  await waitFor(() => {
    // Verify that state is updated based on URL parameters on mount
    expect(result.current.currentPageNumber).toBe(page);
    expect(result.current.pageSize).toBe(size);
  });

  expect(setSearchParams).toHaveBeenCalledWith(
    {
      [pageNumberParamName]: `${page}`,
      [pageSizeParamName]: `${size}`,
    },
    { replace: true }
  );
});

it('usePaginationState updates state based on URL parameters on mount', async () => {
  const page = 2;
  const size = 20;
  const mockUseSearchParamsNew = (): ReturnType<typeof useSearchParams> => {
    const params = new URLSearchParams();
    params.set('page', `${page}`);
    params.set('size', `${size}`);

    return [params, setSearchParams];
  };

  vi.spyOn(ReactRouterDOM, 'useSearchParams').mockImplementationOnce(mockUseSearchParamsNew);

  const options: IUsePaginationStateOptions = {
    startingPageNumber,
    pageSizes,
    pageNumberParamName,
    pageSizeParamName,
  };

  // Render hook
  const { result } = callHook(options, { page, size });

  // Verify that state is updated based on URL parameters on mount
  expect(result.current.currentPageNumber).toBe(page);
  expect(result.current.pageSize).toBe(size);
  expect(setSearchParams).toHaveBeenCalledWith(
    {
      [pageNumberParamName]: `${page}`,
      [pageSizeParamName]: `${size}`,
    },
    { replace: true }
  );
});

it('usePaginationState updates URL parameters on state change', async () => {
  const page = 3;
  const size = 30;
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
    result.current.setPageSize(size);
    result.current.setCurrentPageNumber(page);
  });

  // Verify that URL parameters are updated on state change
  expect(result.current.pageSize).toBe(size);
  expect(result.current.currentPageNumber).toBe(page);
  expect(setSearchParams).toHaveBeenCalledWith(
    {
      [pageNumberParamName]: `${page}`,
      [pageSizeParamName]: `${size}`,
    },
    { replace: true }
  );
});

it('usePaginationState does not update URL parameters when areSearchParamsEnabled is false', async () => {
  const options: IUsePaginationStateOptions = {
    areSearchParamsEnabled: false,
    startingPageNumber,
    pageSizes,
    pageNumberParamName,
    pageSizeParamName,
  };

  // Render hook
  const { result } = callHook(options);

  await waitFor(() => {
    // Verify that state is updated based on URL parameters on mount
    expect(result.current.currentPageNumber).toBe(1);
    expect(result.current.pageSize).toBe(10);
    expect(setSearchParams).not.toHaveBeenCalled();
  });
});

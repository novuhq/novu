import { act, waitFor } from '@testing-library/react';
import { renderHook } from '@testing-library/react-hooks';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import * as ReactRouterDOM from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';

import { IUsePaginationQueryParamsStateOptions, usePaginationQueryParamsState } from './usePaginationQueryParamsState';

const initialPageNumber = 1;
const pageSizes = [10, 20, 30];
const defaultPageNumberQueryParamName = 'page';
const defaultPageSizeQueryParamName = 'size';

const callHook = (options: IUsePaginationQueryParamsStateOptions, initialParams?: { page: number; size: number }) => {
  const paramStr = initialParams ? `?page=${initialParams.page}&size=${initialParams.size}` : '';

  return renderHook(() => usePaginationQueryParamsState(options), {
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

it('usePaginationQueryParamsState uses defaults', async () => {
  const page = initialPageNumber;
  const size = pageSizes[0];
  const options: IUsePaginationQueryParamsStateOptions = {
    defaultPageNumberQueryParamName,
    defaultPageSizeQueryParamName,
  };

  // Render hook
  const { result } = callHook(options);

  await waitFor(() => {
    // Verify that state is updated based on URL parameters on mount
    expect(result.current.currentPageNumberQueryParam).toBe(page);
    expect(result.current.pageSizeQueryParam).toBe(size);
  });

  const newSearchParams = new URLSearchParams({
    [defaultPageNumberQueryParamName]: `${page}`,
    [defaultPageSizeQueryParamName]: `${size}`,
  });
  expect(setSearchParams).toHaveBeenCalledWith(newSearchParams, { replace: true });
});

it('usePaginationQueryParamsState updates state based on URL parameters on mount', async () => {
  const page = 2;
  const size = 20;
  const mockUseSearchParamsNew = (): ReturnType<typeof useSearchParams> => {
    const params = new URLSearchParams();
    params.set('page', `${page}`);
    params.set('size', `${size}`);

    return [params, setSearchParams];
  };

  vi.spyOn(ReactRouterDOM, 'useSearchParams').mockImplementationOnce(mockUseSearchParamsNew);

  const options: IUsePaginationQueryParamsStateOptions = {
    initialPageNumber,
    pageSizes,
    defaultPageNumberQueryParamName,
    defaultPageSizeQueryParamName,
  };

  // Render hook
  const { result } = callHook(options, { page, size });

  // Verify that state is updated based on URL parameters on mount
  expect(result.current.currentPageNumberQueryParam).toBe(page);
  expect(result.current.pageSizeQueryParam).toBe(size);

  const newSearchParams = new URLSearchParams({
    [defaultPageNumberQueryParamName]: `${page}`,
    [defaultPageSizeQueryParamName]: `${size}`,
  });
  expect(setSearchParams).toHaveBeenCalledWith(newSearchParams, { replace: true });
});

it('usePaginationQueryParamsState updates URL parameters on state change', async () => {
  const page = 3;
  const size = 30;
  const options: IUsePaginationQueryParamsStateOptions = {
    initialPageNumber,
    pageSizes,
    defaultPageNumberQueryParamName,
    defaultPageSizeQueryParamName,
  };

  // Render hook
  const { result } = callHook(options);

  // Update state to trigger URL parameter update
  act(() => {
    result.current.setPageSizeQueryParam(size);
    result.current.setCurrentPageNumberQueryParam(page);
  });

  // Verify that URL parameters are updated on state change
  expect(result.current.pageSizeQueryParam).toBe(size);
  expect(result.current.currentPageNumberQueryParam).toBe(page);

  const newSearchParams = new URLSearchParams({
    [defaultPageNumberQueryParamName]: `${page}`,
    [defaultPageSizeQueryParamName]: `${size}`,
  });
  expect(setSearchParams).toHaveBeenCalledWith(newSearchParams, { replace: true });
});

it('usePaginationQueryParamsState does not update URL parameters when areSearchParamsEnabled is false', async () => {
  const options: IUsePaginationQueryParamsStateOptions = {
    areSearchParamsEnabled: false,
    initialPageNumber,
    pageSizes,
    defaultPageNumberQueryParamName,
    defaultPageSizeQueryParamName,
  };

  // Render hook
  const { result } = callHook(options);

  await waitFor(() => {
    // Verify that state is updated based on URL parameters on mount
    expect(result.current.currentPageNumberQueryParam).toBe(1);
    expect(result.current.pageSizeQueryParam).toBe(10);
    expect(setSearchParams).not.toHaveBeenCalled();
  });
});

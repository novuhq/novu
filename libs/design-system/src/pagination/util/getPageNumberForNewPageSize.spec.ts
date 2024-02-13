import { describe, it, expect } from 'vitest';
import { getPageNumberForNewPageSize, IAdjustedPageNumParams } from './getPageNumberForNewPageSize';

describe('getPageNumberForNewPageSize', () => {
  it('computes the new page size as 1 when the currentPageNumber * prevPageSize < newPageSize', () => {
    const params: IAdjustedPageNumParams = {
      prevPageSize: 10,
      newPageSize: 50,
      totalItemCount: 80,
      currentPageNumber: 3,
    };
    const result = getPageNumberForNewPageSize(params);
    expect(result).toBe(1);
  });

  it('computes a page greater than 1 when the previous and new item ranges do not include the first item', () => {
    const params: IAdjustedPageNumParams = {
      prevPageSize: 10,
      newPageSize: 25,
      totalItemCount: 80,
      currentPageNumber: 5,
    };
    const result = getPageNumberForNewPageSize(params);
    expect(result).toBe(2);
  });

  it('returns 3 when moving from a higher to lower page size ', () => {
    const params: IAdjustedPageNumParams = {
      prevPageSize: 25,
      newPageSize: 10,
      totalItemCount: 46,
      currentPageNumber: 2,
    };
    const result = getPageNumberForNewPageSize(params);
    expect(result).toBe(3);
  });

  it('computes a higher page number when switching to a smaller page size', () => {
    const params: IAdjustedPageNumParams = {
      prevPageSize: 50,
      newPageSize: 25,
      totalItemCount: 122,
      currentPageNumber: 3,
    };
    const result = getPageNumberForNewPageSize(params);
    expect(result).toBe(5);
  });

  it('ensures the current page number is clamped for the new total page count', () => {
    const params: IAdjustedPageNumParams = {
      prevPageSize: 10,
      newPageSize: 25,
      totalItemCount: 20,
      currentPageNumber: 2,
    };
    const result = getPageNumberForNewPageSize(params);
    expect(result).toBe(1);
  });
});

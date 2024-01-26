import { expect, it, describe } from 'vitest';
import { MAX_PAGE_COUNT_WITHOUT_ELLIPSIS } from '../Pagination.const';
import { getPaginationSymbols, PaginationSymbol } from './getPaginationSymbols';

describe(getPaginationSymbols.name, () => {
  it('should have a single page number for 1 page', () => {
    expect(getPaginationSymbols({ totalPageCount: 1, currentPageNumber: 1, siblingCount: 2 })).toEqual([1]);
  });

  it('should have 3 page numbers for 3 pages', () => {
    expect(getPaginationSymbols({ totalPageCount: 3, currentPageNumber: 1, siblingCount: 2 })).toEqual([1, 2, 3]);
  });

  it('should show all page numbers for "max pages without ellipsis" regardless of sibling count', () => {
    expect(
      getPaginationSymbols({ totalPageCount: MAX_PAGE_COUNT_WITHOUT_ELLIPSIS, currentPageNumber: 3, siblingCount: 0 })
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(
      getPaginationSymbols({ totalPageCount: MAX_PAGE_COUNT_WITHOUT_ELLIPSIS, currentPageNumber: 3, siblingCount: 2 })
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(
      getPaginationSymbols({ totalPageCount: MAX_PAGE_COUNT_WITHOUT_ELLIPSIS, currentPageNumber: 3, siblingCount: 6 })
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('should show omit ellipsis and show page numbers when within the "window size" - 1 of page 1', () => {
    expect(getPaginationSymbols({ totalPageCount: 11, currentPageNumber: 5, siblingCount: 2 })).toEqual([
      1,
      2,
      3,
      4,
      5,
      6,
      7,
      'ELLIPSIS',
      11,
    ] as PaginationSymbol[]);
  });

  it('should show show ellipsis a when at "window size" or above of page 1', () => {
    expect(getPaginationSymbols({ totalPageCount: 11, currentPageNumber: 6, siblingCount: 2 })).toEqual([
      1,
      'ELLIPSIS',
      4,
      5,
      6,
      7,
      8,
      'ELLIPSIS',
      11,
    ] as PaginationSymbol[]);
  });

  it('should show assymetric siblings for a >10 pages', () => {
    expect(getPaginationSymbols({ totalPageCount: 48, currentPageNumber: 24, siblingCount: 2 })).toEqual([
      1,
      'ELLIPSIS',
      22,
      23,
      24,
      25,
      26,
      'ELLIPSIS',
      48,
    ] as PaginationSymbol[]);
  });

  it('should show symmetric siblings for 100 <= pages < 10000', () => {
    expect(getPaginationSymbols({ totalPageCount: 500, currentPageNumber: 101, siblingCount: 2 })).toEqual([
      1,
      'ELLIPSIS',
      99,
      100,
      101,
      102,
      103,
      'ELLIPSIS',
      500,
    ] as PaginationSymbol[]);
  });

  /** FIXME: tests for shrinking window size + asymmetric windows */
  describe('tests that rely upon a window size that changes based on total page count', () => {
    // FIXME: expect this to fail because I will not implement asymmetry until I get word from Nik
    it.fails('should show assymetric siblings for a >10 pages', () => {
      expect(getPaginationSymbols({ totalPageCount: 48, currentPageNumber: 24, siblingCount: 2 })).toEqual([
        1,
        'ELLIPSIS',
        22,
        23,
        24,
        25,
        26,
        27,
        'ELLIPSIS',
        48,
      ] as PaginationSymbol[]);
    });

    // FIXME: expect this to fail because I will not implement it until I get word from Nik
    it.fails('should show asymmetric siblings for page counts >= 10000', () => {
      expect(getPaginationSymbols({ totalPageCount: 25000, currentPageNumber: 1003, siblingCount: 2 })).toEqual([
        1,
        'ELLIPSIS',
        1001,
        1002,
        1003,
        1004,
        'ELLIPSIS',
        25000,
      ] as PaginationSymbol[]);
    });

    // FIXME: Fails because this uses the shrinking window size
    it.fails('should work for 5-digit page numbers', () => {
      expect(getPaginationSymbols({ totalPageCount: 25000, currentPageNumber: 11111, siblingCount: 2 })).toEqual([
        1,
        'ELLIPSIS',
        11110,
        11111,
        11112,
        'ELLIPSIS',
        25000,
      ] as PaginationSymbol[]);
    });

    // FIXME: Fails because this uses the shrinking window size
    it.fails('should show the last 5 values when within (2 * siblingCount + 1) pages of the last page', () => {
      expect(getPaginationSymbols({ totalPageCount: 25000, currentPageNumber: 25000, siblingCount: 2 })).toEqual([
        1,
        'ELLIPSIS',
        24996,
        24997,
        24998,
        24999,
        25000,
      ] as PaginationSymbol[]);
    });
  });
});

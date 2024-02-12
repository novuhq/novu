import { expect, describe, it } from 'vitest';
import { clampPageNumber } from './clampPageNumber';

const FIRST_PAGE_NUMBER = 1;

describe('clampPageNumber', () => {
  it('should clamp page number to the first page if it is less than the first page number', () => {
    const result = clampPageNumber(0, { totalPageCount: 10, currentPageNumber: 5 });
    expect(result).to.equal(FIRST_PAGE_NUMBER);
  });

  it('should clamp page number to the total page count if it is greater than the total page count', () => {
    const result = clampPageNumber(15, { totalPageCount: 10, currentPageNumber: 5 });
    expect(result).to.equal(10);
  });

  it('should return the new page number if it is within the safe bounds', () => {
    const result = clampPageNumber(3, { totalPageCount: 10, currentPageNumber: 5 });
    expect(result).to.equal(3);
  });

  it('should return the current page number if the new page number is not an integer', () => {
    const result = clampPageNumber(3.5, { totalPageCount: 10, currentPageNumber: 5 });
    expect(result).to.equal(5);
  });

  it('should return the first page number if total page count is zero', () => {
    const result = clampPageNumber(3, { totalPageCount: 0, currentPageNumber: 5 });
    expect(result).to.equal(FIRST_PAGE_NUMBER);
  });

  it('should return the first page number if total page count is negative', () => {
    const result = clampPageNumber(3, { totalPageCount: -5, currentPageNumber: 5 });
    expect(result).to.equal(FIRST_PAGE_NUMBER);
  });
});

/** Default page size options for pagination  */
export const DEFAULT_PAGINATION_PAGE_SIZES = [10, 25, 50, 100];
export const DEFAULT_PAGE_SIZE = 10;

export const FIRST_PAGE_NUMBER = 1;
/** based on designs -- the maximum value for which all page numbers should be shown simultaneously */
export const MAX_PAGE_COUNT_WITHOUT_ELLIPSIS = 10;

/**
 * default number of "siblings" on pagination. A "sibling" is a page number on each side of the current page number
 * E.g. pagination with 2 siblings for a current page of 14 would look like the below -- note there are 2 values to each side:
 *
 * 12 13 [14] 15 16
 */
export const DEFAULT_SIBLING_COUNT = 2;
export const MIN_SIBLING_COUNT = 1;
export const MAX_SIBLING_COUNT = 5;

export const DEFAULT_ELLIPSIS_NODE = '...';

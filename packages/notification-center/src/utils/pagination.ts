import type { IPaginatedResponse } from '@novu/shared';

export const getNextPageParam = (lastPage: IPaginatedResponse) => {
  const newPageTotalCount = (lastPage.page + 1) * lastPage.pageSize;
  const hasNextPage = newPageTotalCount < lastPage.totalCount;

  return hasNextPage ? lastPage.page + 1 : undefined;
};

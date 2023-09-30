import type { IPaginatedResponse } from '@novu/shared';

export const getNextPageParam = (lastPage: IPaginatedResponse) => {
  return lastPage.hasMore ? lastPage.page + 1 : undefined;
};

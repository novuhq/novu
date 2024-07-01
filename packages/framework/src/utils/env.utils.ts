import { Response as CrossFetchResponse } from 'cross-fetch';

export const getResponse = (): typeof Response => {
  if (typeof Response !== 'undefined') {
    return Response;
  }

  return CrossFetchResponse;
};

import { IResponseError } from '../types';

export const checkIsResponseError = (err: unknown): err is IResponseError => {
  return !!err && typeof err === 'object' && 'error' in err && 'message' in err && 'statusCode' in err;
};

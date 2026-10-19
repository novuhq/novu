import { IResponseError } from '../types';

/**
 * Validate (type-guard) that an error response matches our IResponseError interface.
 */
export const checkIsResponseError = (err: unknown): err is IResponseError => {
  return !!err && typeof err === 'object' && 'error' in err && 'message' in err && 'statusCode' in err;
};

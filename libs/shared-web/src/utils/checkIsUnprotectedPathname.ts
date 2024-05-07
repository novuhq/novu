import { UNPROTECTED_ROUTES_SET } from '../constants';

export const checkIsUnprotectedPathname = (curPathname: string): boolean => {
  return UNPROTECTED_ROUTES_SET.has(curPathname);
};

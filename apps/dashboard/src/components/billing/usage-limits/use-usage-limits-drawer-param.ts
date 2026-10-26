import { USAGE_LIMITS_DRAWER_OPEN_VALUE, USAGE_LIMITS_DRAWER_PARAM } from '@novu/shared';
import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';

/** The drawer's open state lives in `?usageLimits=open`, so any page link can deep-link into it. */
export function useUsageLimitsDrawerParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDrawerRequested = searchParams.get(USAGE_LIMITS_DRAWER_PARAM) === USAGE_LIMITS_DRAWER_OPEN_VALUE;

  const setIsDrawerRequested = useCallback(
    (isRequested: boolean) => {
      setSearchParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          if (isRequested) {
            next.set(USAGE_LIMITS_DRAWER_PARAM, USAGE_LIMITS_DRAWER_OPEN_VALUE);
          } else {
            next.delete(USAGE_LIMITS_DRAWER_PARAM);
          }

          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  return { isDrawerRequested, setIsDrawerRequested };
}

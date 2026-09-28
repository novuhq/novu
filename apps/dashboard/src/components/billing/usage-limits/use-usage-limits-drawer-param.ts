import { useSearchParams } from 'react-router-dom';

const USAGE_LIMITS_PARAM = 'usageLimits';
const OPEN_VALUE = 'open';

/** The drawer's open state lives in `?usageLimits=open`, so any page link can deep-link into it. */
export function useUsageLimitsDrawerParam() {
  const [searchParams, setSearchParams] = useSearchParams();
  const isDrawerRequested = searchParams.get(USAGE_LIMITS_PARAM) === OPEN_VALUE;

  const setIsDrawerRequested = (isRequested: boolean) => {
    setSearchParams(
      (previous) => {
        const next = new URLSearchParams(previous);

        if (isRequested) {
          next.set(USAGE_LIMITS_PARAM, OPEN_VALUE);
        } else {
          next.delete(USAGE_LIMITS_PARAM);
        }

        return next;
      },
      { replace: true }
    );
  };

  return { isDrawerRequested, setIsDrawerRequested };
}

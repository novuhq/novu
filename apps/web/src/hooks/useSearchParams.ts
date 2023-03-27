import { useMemo } from 'react';

export const useSearchParams = () => {
  const params = useMemo(() => {
    return Array.from(new URL(window.location.href).searchParams.entries()).reduce((prev: any, item) => {
      prev[item[0]] = item[1];

      return prev;
    }, {});
  }, [window.location.href]);

  return params;
};

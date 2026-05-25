import { useCallback } from 'react';
import { IS_HOSTNAME_SPLIT_ENABLED } from '@/config';
import { isAbsoluteUrl } from '@/utils/apps';

export function useCrossAppNavigation() {
  return useCallback((href: string, openInNewTab = false) => {
    const isCrossOrigin = IS_HOSTNAME_SPLIT_ENABLED && isAbsoluteUrl(href);

    if (openInNewTab) {
      window.open(href, '_blank', 'noopener,noreferrer');

      return;
    }

    if (!isCrossOrigin) {
      window.location.assign(href);

      return;
    }

    window.location.assign(href);
  }, []);
}

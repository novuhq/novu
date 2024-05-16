import { useSegment } from '@novu/shared-web';
import { useEffect } from 'react';

type LocationField = keyof Pick<Location, 'href' | 'hash' | 'host' | 'hostname' | 'origin' | 'pathname'>;
export interface IUsePageViewTrackingProps {
  urlOverride?: string;
  locationField?: LocationField;
}

const DEFAULT_LOCATION_FIELD: LocationField = 'pathname';
/**
 * Use analytics tracking for the current page URL onMount.
 *
 * If using the options, ensure they are properly memoized, otherwise a tracking event will fire each time
 * on of the fields changes.
 */
export function usePageViewTracking(
  { urlOverride, locationField = DEFAULT_LOCATION_FIELD }: IUsePageViewTrackingProps = {
    locationField: DEFAULT_LOCATION_FIELD,
  }
): void {
  const segment = useSegment();

  useEffect(() => {
    segment.pageView(urlOverride ?? window.location[locationField]);
  }, [segment, urlOverride, locationField]);
}

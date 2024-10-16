import React from 'react';
import { SegmentContext } from './segment-provider';

/**
 * Note: you cannot destructure the result of this hook without risking pre-mature access of the underlying AnalyticsService.
 *
 * const segment = useSegment();
 */
export const useSegment = () => {
  const result = React.useContext(SegmentContext);
  if (!result) {
    throw new Error('Context used outside of its Provider!');
  }

  return result;
};

import React from 'react';
import { SegmentContext } from '../store/segment.context';

export const useSegment = () => {
  const result = React.useContext(SegmentContext);
  if (!result) {
    throw new Error('Context used outside of its Provider!');
  }

  return result;
};

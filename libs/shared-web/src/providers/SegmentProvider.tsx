import React from 'react';

import { SegmentService } from '../utils';

type Props = {
  children: React.ReactNode;
};

const SegmentContext = React.createContext<SegmentService>(undefined as any);

export const SegmentProvider = ({ children }: Props) => {
  const segment = React.useMemo(() => new SegmentService(), []);

  return <SegmentContext.Provider value={segment}>{children}</SegmentContext.Provider>;
};

export const useSegment = () => {
  const result = React.useContext(SegmentContext);
  if (!result) {
    throw new Error('Context used outside of its Provider!');
  }

  return result;
};

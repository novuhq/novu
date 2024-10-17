import { SegmentService } from '@/utils/segment';
import React from 'react';

type Props = {
  children: React.ReactNode;
};

export const SegmentContext = React.createContext<SegmentService>({} as SegmentService);

export const SegmentProvider = ({ children }: Props) => {
  const segment = React.useMemo(() => new SegmentService(), []);

  return <SegmentContext.Provider value={segment}>{children}</SegmentContext.Provider>;
};

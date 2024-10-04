import { ReactNode } from 'react';

export const Show = ({ when, fallback, children }: { when: boolean; fallback?: ReactNode; children: ReactNode }) => {
  return when ? children : fallback ? fallback : null;
};

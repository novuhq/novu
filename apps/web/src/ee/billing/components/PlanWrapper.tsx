import React from 'react';
import { colors } from '@novu/design-system';

export const PlanWrapper = ({ children, isDark }: { children: React.ReactNode; isDark: boolean }) => {
  return (
    <div
      style={{
        boxShadow: isDark ? '0px 5px 20px rgba(0, 0, 0, 0.20)' : '0px 5px 15px rgba(122.40, 132.60, 153, 0.25)',
        borderRadius: '12px',
        overflow: 'hidden',
        background: isDark ? colors.B17 : colors.white,
      }}
    >
      {children}
    </div>
  );
};

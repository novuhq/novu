import React from 'react';
import { Badge } from '@mantine/core';
import { colors } from '../config';

/**
 * Gradient Badge Component
 *
 */
export function NotificationBadge({ children }: { children: React.ReactNode }) {
  return (
    <Badge
      sx={{
        padding: 0,
        width: 20,
        height: 20,
        pointerEvents: 'none',
        border: 'none',
        background: colors.horizontal,
        lineHeight: '14px',
        color: colors.white,
        fontWeight: 'bold',
        fontSize: '12px',
      }}
      radius={100}
    >
      {children}
    </Badge>
  );
}

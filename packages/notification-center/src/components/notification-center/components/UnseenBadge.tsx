import React from 'react';
import { Badge } from '@mantine/core';
import { useNovuTheme } from '../../../hooks';

export function UnseenBadge({ unseenCount }: { unseenCount: number }) {
  const { theme, common } = useNovuTheme();

  return (
    <>
      {unseenCount && unseenCount > 0 ? (
        <Badge
          data-test-id="unseen-count-label"
          sx={{
            padding: 0,
            marginLeft: 10,
            width: 25,
            height: 20,
            pointerEvents: 'none',
            border: 'none',
            background: theme.header?.badgeColor,
            fontFamily: common.fontFamily,
            lineHeight: '14px',
            color: theme.header?.badgeTextColor,
            fontWeight: 'bold',
            fontSize: '12px',
          }}
          radius={10}
        >
          {unseenCount}
        </Badge>
      ) : null}
    </>
  );
}

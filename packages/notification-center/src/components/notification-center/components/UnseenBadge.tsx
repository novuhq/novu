import { useNovuThemeProvider } from '../../../hooks/use-novu-theme-provider.hook';
import { Badge } from '@mantine/core';
import React from 'react';

export function UnseenBadge({ unseenCount }: { unseenCount: number }) {
  const { theme, common } = useNovuThemeProvider();

  return (
    <>
      {unseenCount && unseenCount > 0 ? (
        <Badge
          data-test-id="unseen-count-label"
          sx={{
            padding: 0,
            marginLeft: 10,
            width: 20,
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
          radius={100}
        >
          {unseenCount}
        </Badge>
      ) : null}
    </>
  );
}

import React from 'react';
import { createStyles, Group } from '@mantine/core';

import { colors } from '@novu/design-system';
import { cx } from '@novu/novui/css';

const useStyles = createStyles((theme, { error, isBlur }: { error?: boolean; isBlur?: boolean }) => ({
  browser: {
    backgroundColor: theme.colorScheme === 'dark' ? colors.B15 : colors.B98,
    borderRadius: '8px',
    height: '100%',
    minHeight: '50vh',
    width: '100%',
  },
  bar: {
    borderRadius: '8px 8px 0 0',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.B85,
    width: '100%',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
  },
  barAction: {
    height: '8px',
    width: '8px',
    borderRadius: '50%',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B17 : colors.B98,
  },
  header: {
    width: '100%',
  },
  subject: {
    marginBottom: '3px',
    fontWeight: 'bolder',
  },
  from: {
    color: theme.colorScheme === 'dark' ? colors.B60 : colors.B40,
    fontWeight: 'normal',
  },
  content: {
    borderRadius: '8px',
    backgroundColor: theme.colorScheme === 'dark' ? colors.B20 : colors.white,
    flex: 1,
    border: error ? `1px solid ${colors.error}` : 'none',
    position: 'relative',
    filter: isBlur ? 'blur(2px)' : 'none',
  },
  contentContainer: {
    padding: '24px',
    paddingBottom: '32px',
    height: 'calc(100% - 28px)',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  frame: {
    border: '0px',
    width: '100%',
    height: '100%',
    borderRadius: '8px',
  },
  fallbackFrame: {
    border: '0px',
    width: '100%',
    height: '100%',
    padding: '15px',
    textAlign: 'center',
  },
  overlayContainer: {
    position: 'relative',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
}));

export const TitleBarWrapper = ({ children }) => {
  const { classes } = useStyles({});

  return (
    <div className={cx(classes.browser)}>
      <div className={classes.bar}>
        <Group spacing={6}>
          <div className={classes.barAction}></div>
          <div className={classes.barAction}></div>
          <div className={classes.barAction}></div>
        </Group>
      </div>
      {children}
    </div>
  );
};

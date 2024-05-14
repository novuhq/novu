import React from 'react';
import { createStyles, Box } from '@mantine/core';
import { ThemeProvider } from '@novu/design-system';
import { CONTEXT_PATH } from '../../../config';

export default function AuthLayout({ children }: { children?: React.ReactNode }) {
  const { classes } = useStyles();

  return (
    <ThemeProvider>
      <div className={classes.wrapper + ' ' + classes.bg}>{children}</div>
    </ThemeProvider>
  );
}

const useStyles = createStyles((theme) => ({
  wrapper: {
    display: 'grid',
    gridAutoFlow: 'column',
    gridAutoColumns: '1fr',
    columnGap: 25,
    minHeight: '100vh',
  },
  bg: {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
    minWidth: 600,
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundImage: 'url(' + CONTEXT_PATH + '/static/images/auth-bg.jpg)',
    '@media (max-width: 1100px)': {
      display: 'none',
      minWidth: 'auto',
      borderRadius: '0',
    },
    backgroundColor: 'rgb(0 0 0 / 51%)',
    backgroundBlendMode: 'overlay',
  },
}));

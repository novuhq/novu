import React from 'react';
import { createStyles, Box } from '@mantine/core';
import { ThemeProvider } from '../../../design-system/ThemeProvider';

export default function AuthLayout({ children }: { children?: React.ReactNode }) {
  const { classes } = useStyles();

  return (
    <ThemeProvider>
      <div style={{ minHeight: 950 }}>
        <div className={classes.wrapper}>
          <img
            src="/static/images/logo-formerly-dark-bg.png"
            alt="logo"
            style={{ maxWidth: 150, marginTop: 5, marginLeft: 5 }}
          />
          <Box
            sx={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              left: 120,
              top: 'calc(50% - 165px)',
              '@media (max-width: 1200px)': {
                display: 'none',
              },
            }}
          >
            <img src="/static/images/notifications/notification_01.png" alt="logo" style={{ maxWidth: 400 }} />
            <img
              src="/static/images/notifications/notification_02.png"
              alt="logo"
              style={{ marginTop: -15, marginLeft: 30, maxWidth: 400 }}
            />
            <img
              src="/static/images/notifications/notification_03.png"
              alt="logo"
              style={{ marginTop: -15, maxWidth: 400 }}
            />
          </Box>{' '}
        </div>
        {children}
      </div>
    </ThemeProvider>
  );
}

const useStyles = createStyles((theme) => ({
  wrapper: {
    height: '100%',
    minHeight: 950,
    position: 'absolute',
    width: '100%',
    zIndex: -1,
    left: '0px',
    top: '0px',
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundImage: `url('/static/images/signin_bg.png')`,
    '@media (max-width: 1100px)': {
      display: 'none',
    },
  },
}));

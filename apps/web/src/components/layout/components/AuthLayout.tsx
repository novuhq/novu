import React from 'react';
import { Box, createStyles } from '@mantine/core';
import { ThemeProvider } from '../../../design-system/ThemeProvider';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const { classes } = useStyles();

  return (
    <ThemeProvider>
      <div>
        <div className={classes.wrapper}>
          <img src="/static/images/logo.png" alt="logo" style={{ maxWidth: 150 }} />
        </div>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            '@media (max-width: 1200px)': {
              display: 'none',
            },
          }}>
          <img
            src="/static/images/notifications/notification_01.png"
            alt="logo"
            style={{ position: 'absolute', maxWidth: 400, left: '7%', top: '35%' }}
          />
          <img
            src="/static/images/notifications/notification_02.png"
            alt="logo"
            style={{ position: 'absolute', left: '10%', top: '45%', maxWidth: 400 }}
          />
          <img
            src="/static/images/notifications/notification_03.png"
            alt="logo"
            style={{ position: 'absolute', left: '7%', top: '55%', maxWidth: 400 }}
          />
        </Box>

        {children}
      </div>
    </ThemeProvider>
  );
}

const useStyles = createStyles((theme) => ({
  wrapper: {
    height: '100%',
    position: 'absolute',
    width: '100%',
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

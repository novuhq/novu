import { createStyles, Box } from '@mantine/core';
import { Outlet } from 'react-router-dom';
import { CONTEXT_PATH } from '../../../config/index';

export function PublicPageLayout() {
  const { classes } = useStyles();

  return (
    <div className={classes.wrapper}>
      <div className={classes.bg}>
        <img
          src={`${CONTEXT_PATH}/static/images/logo-light.webp`}
          alt="logo"
          style={{ alignSelf: 'flex-start', maxWidth: 150, marginTop: 5, marginLeft: 5 }}
        />
        <Box
          sx={{
            position: 'absolute',
            right: '50%',
            display: 'flex',
            flexDirection: 'column',
            transform: 'translate(35%, 7%)',
            '@media (max-width: 1200px)': {
              display: 'none',
            },
          }}
        >
          <img
            src={`${CONTEXT_PATH}/static/images/notifications/notification_01.webp`}
            alt="logo"
            style={{ maxWidth: 400 }}
          />
          <img
            src={`${CONTEXT_PATH}/static/images/notifications/notification_02.webp`}
            alt="logo"
            style={{ marginTop: -15, marginLeft: 30, maxWidth: 400 }}
          />
          <img
            src={`${CONTEXT_PATH}/static/images/notifications/notification_03.webp`}
            alt="logo"
            style={{ marginTop: -15, maxWidth: 400 }}
          />
        </Box>{' '}
      </div>
      <Outlet />
    </div>
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
    backgroundSize: '70% 100%',
    backgroundRepeat: 'no-repeat',
    backgroundImage: `url(${CONTEXT_PATH}/static/images/signin_bg.webp)`,
    '@media (max-width: 1100px)': {
      display: 'none',
    },
  },
}));

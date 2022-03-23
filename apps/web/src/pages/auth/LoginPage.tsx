import { useContext, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, Container, createStyles, Group } from '@mantine/core';
import { AuthContext } from '../../store/authContext';
import { LoginForm } from '../../components/auth/LoginForm';
import { ThemeProvider } from '../../design-system/ThemeProvider';

export default function LoginPage() {
  const { setToken, token } = useContext(AuthContext);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const queryToken = params.get('token');
  const { classes } = useStyles();

  useEffect(() => {
    if (queryToken) {
      setToken(queryToken);
    }
  }, [queryToken]);

  useEffect(() => {
    if (token) {
      navigate('/');
    }
  }, [token]);

  return (
    <ThemeProvider>
      <div>
        <div className={classes.wrapper}>
          <img src="/static/images/logo.png" alt="logo" style={{ maxWidth: 150 }} />
        </div>
        <Group spacing={40}>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <img
              src="/static/images/notifications/notification_01.png"
              alt="logo"
              style={{ position: 'relative', maxWidth: 400, left: 100, top: 100 }}
            />
            <img
              src="/static/images/notifications/notification_02.png"
              alt="logo"
              style={{ position: 'relative', left: 150, top: 90, maxWidth: 400 }}
            />
            <img
              src="/static/images/notifications/notification_03.png"
              alt="logo"
              style={{ position: 'relative', left: 100, top: 85, maxWidth: 400 }}
            />
          </Box>
          <Container sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }} className={classes.form}>
            <LoginForm />
          </Container>
        </Group>
      </div>
    </ThemeProvider>
  );
}

const useStyles = createStyles((theme) => ({
  wrapper: {
    minHeight: 900,
    height: '100%',
    position: 'absolute',
    width: '100%',
    left: '0px',
    top: '0px',
    backgroundSize: 'contain',
    backgroundRepeat: 'no-repeat',
    backgroundImage: `url('/static/images/signin_bg.png')`,
  },

  form: {
    minHeight: 900,
    position: 'relative',
  },

  title: {
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    fontFamily: `Greycliff CF, ${theme.fontFamily}`,
  },

  logo: {
    color: theme.colorScheme === 'dark' ? theme.white : theme.black,
    width: 120,
    display: 'block',
    marginLeft: 'auto',
    marginRight: 'auto',
  },
}));

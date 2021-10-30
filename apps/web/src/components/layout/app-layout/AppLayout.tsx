import React, { useContext, useEffect } from 'react';
import { Layout, Grid, Result, Button, Divider } from 'antd';
import * as Sentry from '@sentry/react';
import { ThemeProvider } from 'styled-components';
import { HeaderNav } from '../components/HeaderNav';
import { SideNav } from '../components/SideNav';
import { AuthContext } from '../../../store/authContext';
import { useApplication } from '../../../api/hooks/use-application';

const { Header, Content, Footer } = Layout;

export function AppLayout({ children }: { children: any }) {
  const authContext = useContext(AuthContext);
  const { application } = useApplication();
  const theme = {
    colors: {
      main: application?.branding?.color || '#cd5450',
    },
    layout: {
      direction: application?.branding?.direction || 'ltr',
    },
  };

  useEffect(() => {
    if (
      (process.env.REACT_APP_ENVIRONMENT === 'dev' || process.env.REACT_APP_ENVIRONMENT === 'prod') &&
      authContext.currentUser
    ) {
      (function (n, o, t, i, f) {
        let m;
        /* eslint-disable */
        (n[i] = {}), (m = ['init']);
        n[i]._c = [];
        m.forEach(
          (me) =>
            (n[i][me] = function () {
              n[i]._c.push([me, arguments]);
            })
        );
        const elt: any = o.createElement(f);
        elt.type = 'text/javascript';
        elt.async = true;
        elt.src = t;
        const before = o.getElementsByTagName(f)[0];
        before.parentNode?.insertBefore(elt, before);
      })(window, document, process.env.REACT_APP_WIDGET_SDK_PATH, 'notifire', 'script');

      (window as any).notifire.init(
        process.env.REACT_APP_NOTIFIRE_APP_ID,
        { bellSelector: '#notification-bell', unseenBadgeSelector: '#unseen-badge-selector' },
        {
          $user_id: authContext.currentUser?._id,
          $last_name: authContext.currentUser?.lastName,
          $first_name: authContext.currentUser?.firstName,
          $email: authContext.currentUser?.email,
        }
      );
    }
  }, [authContext.currentUser]);

  return (
    <>
      <ThemeProvider theme={theme}>
        <Layout style={{ minHeight: '100vh' }}>
          <HeaderNav />
          <Layout className="app-container">
            <SideNav />
            <Layout className="app-layout" style={{}}>
              <Sentry.ErrorBoundary
                fallback={({ error, resetError, eventId }) => (
                  <>
                    <Result
                      style={{ marginTop: 80 }}
                      status="500"
                      title="Oh no..."
                      subTitle={
                        <>
                          Sorry, but something went wrong. <br />
                          Our team been notified about it and we will look at it asap.
                          <br />
                        </>
                      }
                      extra={
                        <>
                          <div>
                            <div style={{ marginBottom: 30 }}>
                              <Button type="primary" onClick={() => resetError()}>
                                Go Back
                              </Button>
                            </div>

                            <code>
                              <small style={{ color: 'lightGrey' }}>
                                Event Id: {eventId}.
                                <br />
                                {error.toString()}
                              </small>
                            </code>
                          </div>
                        </>
                      }
                    />
                  </>
                )}>
                <Content style={{ padding: 25, paddingTop: 'calc(64px + 25px)' }}>
                  {children}
                  <Footer style={{ textAlign: 'center' }}>Notifire ©2021</Footer>
                </Content>
              </Sentry.ErrorBoundary>
            </Layout>
          </Layout>
        </Layout>
      </ThemeProvider>
    </>
  );
}

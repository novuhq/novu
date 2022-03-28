import '../../../styles/index.less';
import React, { useContext, useEffect } from 'react';
import { Layout, Grid, Result, Button, Divider } from 'antd';
import * as Sentry from '@sentry/react';
import { ThemeProvider } from 'styled-components';
import { HeaderNav } from '../components/HeaderNav';
import { SideNav } from '../components/SideNav';
import { useApplication } from '../../../../api/hooks/use-application';

const { Header, Content, Footer } = Layout;

export function LegacyAppLayout({ children }: { children: any }) {
  const { application } = useApplication();
  const theme = {
    colors: {
      main: application?.branding?.color || '#cd5450',
    },
    layout: {
      direction: application?.branding?.direction || 'ltr',
    },
  };

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
                  <Footer style={{ textAlign: 'center' }}>Novu ©2022</Footer>
                </Content>
              </Sentry.ErrorBoundary>
            </Layout>
          </Layout>
        </Layout>
      </ThemeProvider>
    </>
  );
}

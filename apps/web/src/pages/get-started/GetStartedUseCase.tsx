import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Center, Container, Loader, Tabs } from '@mantine/core';

import { colors, HalfClock, Digest, MultiChannel, RingingBell, Translation } from '@novu/design-system';

import { HeaderLayout } from './layout/HeaderLayout';
import PageContainer from '../../components/layout/components/PageContainer';
import { useAuthContext } from '../../components/providers/AuthProvider';
import PageHeader from '../../components/layout/components/PageHeader';
import { ROUTES } from '../../constants/routes.enum';
import { When } from '../../components/utils/When';

import { createStyles, MantineTheme } from '@mantine/core';

export const useTabs = createStyles((theme: MantineTheme, _params, getRef) => {
  const dark = theme.colorScheme === 'dark';

  const tab = getRef('tab');
  const tabLabel = getRef('tabLabel');
  const tabIcon = getRef('tabIcon');

  return {
    tabsList: {
      gap: '30px',
      borderBottom: 'none',
    },

    panel: {
      paddingTop: '15px',
    },

    tab: {
      ref: tab,
      width: 'auto',
      cursor: 'pointer',
      padding: '0px',
      height: '30px',
      borderBottom: 'none',

      '&:hover': {
        background: 'none',

        [`& .${tabIcon}`]: {
          color: dark ? colors.white : colors.B40,
        },

        [`& .${tabLabel}`]: {
          color: dark ? colors.white : colors.B40,
        },
      },
      ['&[data-active]']: {
        width: 'auto',

        '&::after': {
          content: '""',
          display: 'block',
          position: 'absolute',
          width: '100%',
          height: '2px',
          bottom: 0,
          background: colors.horizontal,
          borderRadius: '10px',
        },

        [`& .${tabLabel}`]: {
          color: dark ? colors.white : colors.B40,
        },

        [`& .${tabIcon}`]: {
          color: dark ? colors.white : colors.B40,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        },
      },
    },

    tabLabel: {
      ref: tabLabel,
      height: '100%',
      fontSize: '14px',
      fontWeight: 700,
      color: colors.B60,
      paddingBottom: '12px',
      display: 'flex',
      alignItems: 'center',
    },

    tabIcon: {
      ref: tabIcon,
      color: colors.B60,
    },
  };
});

export function GetStartedUseCase() {
  return (
    <>
      <PageContainer title="Get Started">
        <HeaderLayout>
          <PageHeader title="Get Started" />
        </HeaderLayout>
        <GetStartedTabs />
      </PageContainer>
    </>
  );
}

export function GetStartedTabs() {
  const { currentOrganization } = useAuthContext();
  const selfHosted = process.env.REACT_APP_DOCKER_HOSTED_ENV === 'true';
  const { classes } = useTabs();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const value = useMemo(() => {
    return pathname === ROUTES.GET_STARTED ? '/' : pathname.replace(ROUTES.GET_STARTED, '');
  }, [pathname]);

  if (!currentOrganization) {
    return (
      <Center>
        <Loader color={colors.error} size={32} />
      </Center>
    );
  }

  return (
    <Container fluid mt={15} ml={5}>
      <Tabs
        orientation="horizontal"
        keepMounted={true}
        onTabChange={(tabValue) => {
          navigate(ROUTES.GET_STARTED + tabValue);
        }}
        variant="default"
        value={value}
        classNames={classes}
        mb={15}
      >
        <Tabs.List>
          <Tabs.Tab value="/inapp" icon={<RingingBell style={{ height: 20, width: 20, marginBottom: '12px' }} />}>
            In-app
          </Tabs.Tab>
          <Tabs.Tab
            value="/multichannel"
            icon={<MultiChannel style={{ height: 20, width: 20, marginBottom: '12px' }} />}
          >
            Multi-channel
          </Tabs.Tab>
          <Tabs.Tab value="/digest" icon={<Digest style={{ height: 20, width: 20, marginBottom: '12px' }} />}>
            Digest
          </Tabs.Tab>
          <Tabs.Tab value="/delay" icon={<HalfClock style={{ height: 20, width: 20, marginBottom: '12px' }} />}>
            Delay
          </Tabs.Tab>

          <When truthy={!selfHosted}>
            <Tabs.Tab
              value={'/translation'}
              icon={<Translation style={{ height: 20, width: 20, marginBottom: '12px' }} />}
            >
              Translate
            </Tabs.Tab>
          </When>
        </Tabs.List>
      </Tabs>
      <Outlet />
    </Container>
  );
}
